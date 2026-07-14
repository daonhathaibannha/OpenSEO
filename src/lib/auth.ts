import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { captcha } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { isDisposableEmailDomain } from "@/server/auth/disposable-email";
import * as d1Schema from "@/db/d1/schema";
import { d1Db } from "@/db/d1/client";
import { pgDb } from "@/db/pg/client";
import * as pgSchema from "@/db/pg/schema";
import { getDatabaseProvider } from "@/db/provider";
import { z } from "zod";
import {
  getAuthMode,
  isHostedAuthMode,
  isLoginRequiredAuthMode,
} from "@/lib/auth-mode";
import { createBaseAuthConfig } from "@/lib/auth-config";
import {
  getHostedTurnstileSecretKey,
  hasHostedTurnstileConfig,
} from "@/lib/auth-turnstile";
import { getOrCreateDefaultHostedOrganization } from "@/server/auth/default-hosted-organization";
// `local_auth` (self-hosted, login-required) reuses this same Better Auth
// instance for email/password sessions, but deliberately avoids everything
// hosted-SaaS-specific below it (Google OAuth, Turnstile, Autumn-tied
// per-user orgs, disposable-email blocking) — see isHostedAuthMode()'s
// doc-comment in auth-mode.ts. A future SSO provider would attach here too,
// as an additional entry in getSocialProviders()/plugins, without touching
// the local_auth branch below.
import { getOrCreateSharedLocalOrganization } from "@/server/auth/shared-local-organization";
import {
  sendHostedPasswordResetEmail,
  sendHostedVerificationEmail,
  upsertHostedSignupContact,
} from "@/server/email/loops";

const hostedBaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && url.hostname === "localhost")
    );
  }, "BETTER_AUTH_URL must use https or localhost");

// Explicitly typed (not inferred from `auth.api`) so this can be called from
// inside `betterAuth({...})`'s own initializer without TS reporting a
// circular "auth implicitly has type any" error — inferring straight from
// `auth.api` there creates a self-reference cycle.
type SessionOrgAuthApi = {
  createOrganization: (input: {
    body: { name: string; slug: string; userId: string };
  }) => Promise<{ id: string } | null>;
  addMember: (input: {
    body: { userId: string; organizationId: string; role: "member" };
  }) => Promise<unknown>;
};

async function createOrganizationOrThrow(
  authApi: SessionOrgAuthApi,
  body: { name: string; slug: string; userId: string },
): Promise<{ id: string }> {
  const result = await authApi.createOrganization({ body });
  if (!result) {
    throw new Error("Better Auth createOrganization returned no organization");
  }
  return result;
}

// `hosted`: one Autumn-billed org per user, auto-created on first session.
// `local_auth`: everyone shares the single org that exists for this
// deployment (see getOrCreateSharedLocalOrganization).
async function resolveSessionOrganizationId(
  userId: string,
  authApi: SessionOrgAuthApi,
): Promise<string> {
  if (getAuthMode(env.AUTH_MODE) === "local_auth") {
    return getOrCreateSharedLocalOrganization(
      userId,
      (input) => createOrganizationOrThrow(authApi, input),
      (input) => authApi.addMember({ body: input }),
    );
  }
  return getOrCreateDefaultHostedOrganization(userId, (body) =>
    createOrganizationOrThrow(authApi, body),
  );
}

function createAuth() {
  // hosted/local_auth need the real configured URL (cookies, callbacks,
  // /api/auth routes, trusted-origins all use it) since both mint real
  // sessions. local_noauth/cloudflare_access never issue a Better Auth
  // session — this instance exists there only to mint/refresh Search Console
  // tokens, which don't read baseURL, so a placeholder is fine for them.
  const baseUrl = isLoginRequiredAuthMode(env.AUTH_MODE)
    ? getHostedBaseUrl()
    : "http://localhost";
  // local_auth has no email service configured (self-hosted, no Loops keys)
  // and accounts only ever come from admin-driven creation — those are
  // pre-verified by construction, so verification is always bypassed there.
  const bypassEmail =
    Reflect.get(env, "BYPASS_EMAIL_VERIFICATION") === "true" ||
    getAuthMode(env.AUTH_MODE) === "local_auth";
  const baseAuthConfig = createBaseAuthConfig();

  // Turnstile captcha on signup — hosted only. Enforcement is driven by the
  // server-side secret alone so a client build/runtime site-key mismatch cannot
  // silently omit the Better Auth captcha plugin. Hosted deployments that expose
  // the client widget without the matching server secret fail configuration
  // checks instead of presenting a bypassable captcha.
  const turnstileSecretKey = getHostedTurnstileSecretKey(env);

  const database =
    getDatabaseProvider() === "postgres"
      ? drizzleAdapter(pgDb, {
          provider: "pg",
          schema: pgSchema,
        })
      : drizzleAdapter(d1Db, {
          provider: "sqlite",
          schema: d1Schema,
        });

  const auth = betterAuth({
    baseURL: baseUrl,
    secret: getHostedSecret(),
    ...baseAuthConfig,
    emailAndPassword: {
      ...baseAuthConfig.emailAndPassword,
      requireEmailVerification: !bypassEmail,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendHostedPasswordResetEmail({
          email: user.email,
          resetUrl: url,
        });
      },
    },
    emailVerification: bypassEmail
      ? undefined
      : {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async ({ user, url }) => {
            await sendHostedVerificationEmail({
              email: user.email,
              confirmationUrl: url,
            });
          },
        },
    socialProviders: getSocialProviders(),
    trustedOrigins: getTrustedOrigins(baseUrl),
    database,
    plugins: [
      ...baseAuthConfig.plugins,
      ...(turnstileSecretKey
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: turnstileSecretKey,
              endpoints: ["/sign-up/email"],
            }),
          ]
        : []),
      tanstackStartCookies(),
    ],
    databaseHooks: {
      user: {
        create: {
          // Hosted only: keep cheap mass-signups off the free plan by rejecting
          // throwaway-inbox domains before the user row is created. Self-hosted
          // has no shared credit pool to protect, so it's left untouched.
          before: async (user) => {
            if (
              isHostedAuthMode(env.AUTH_MODE) &&
              isDisposableEmailDomain(user.email)
            ) {
              throw new APIError("BAD_REQUEST", {
                message: "Please sign up with a non-disposable email address.",
              });
            }
            return { data: user };
          },
          after: async (user) => {
            await syncHostedSignupContact(user);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const organizationId: string = await resolveSessionOrganizationId(
              session.userId,
              auth.api,
            );

            return {
              data: {
                ...session,
                activeOrganizationId: organizationId,
              },
            };
          },
        },
      },
    },
  });

  return auth;
}

let authInstance: ReturnType<typeof createAuth> | null = null;

async function syncHostedSignupContact(user: {
  id: string;
  email: string;
  name?: string | null;
}) {
  try {
    await upsertHostedSignupContact({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Failed to sync Loops profile after user creation:", {
      userId: user.id,
      email: user.email,
      error,
    });
  }
}

function getTrustedOrigins(baseUrl: string) {
  const trustedOrigins = [baseUrl];

  if (process.env.NODE_ENV !== "production") {
    trustedOrigins.push(
      "http://open-seo.localhost:1355",
      "http://*.open-seo.localhost:1355",
      "https://open-seo.localhost:1355",
      "https://*.open-seo.localhost:1355",
    );
  }

  return trustedOrigins;
}

export function getHostedBaseUrl() {
  const baseUrl = env.BETTER_AUTH_URL?.trim();

  if (!baseUrl) {
    throw new Error("BETTER_AUTH_URL is required in hosted mode");
  }

  return hostedBaseUrlSchema.parse(baseUrl);
}

// Required in hosted mode, and in self-hosted mode when Search Console is
// enabled (it keys the OAuth-token encryption and is needed to build the auth
// instance that mints/refreshes Search Console tokens).
function getHostedSecret() {
  const secret = env.BETTER_AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }

  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }

  return secret;
}

function getSocialProviders() {
  // Google social login is hosted-only. Self-hosted builds the auth instance
  // solely for Search Console token ops, which use the genericOAuth provider
  // (createBaseAuthConfig) with its own creds — so it must NOT require the
  // social-login config here, otherwise getAuth() construction would be coupled
  // to GSC creds rather than just BETTER_AUTH_SECRET.
  if (!isHostedAuthMode(env.AUTH_MODE)) {
    return {};
  }

  return {
    google: getGoogleSocialProviderConfig(),
  };
}

function getGoogleSocialProviderConfig() {
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is required in hosted mode");
  }

  if (!googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is required in hosted mode");
  }

  return {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    mapProfileToUser: (profile: { name?: string }) => ({
      name: profile.name,
    }),
  };
}

function hasHostedAuthEmailConfig() {
  const loopsVars = [
    "LOOPS_API_KEY",
    "LOOPS_TRANSACTIONAL_VERIFY_EMAIL_ID",
    "LOOPS_TRANSACTIONAL_RESET_PASSWORD_ID",
  ];

  return loopsVars.every((name) => {
    const value: unknown = Reflect.get(env, name);
    return typeof value === "string" && value.trim() !== "";
  });
}

export function hasHostedAuthConfig() {
  try {
    getHostedBaseUrl();
    getHostedSecret();
    getGoogleSocialProviderConfig();
    return (
      hasHostedTurnstileConfig(env) &&
      (Reflect.get(env, "BYPASS_EMAIL_VERIFICATION") === "true" ||
        hasHostedAuthEmailConfig())
    );
  } catch {
    return false;
  }
}

// `local_auth` needs far less than `hosted`: no Google OAuth, no Turnstile,
// no email provider (accounts are admin-created and pre-verified) — just a
// base URL (matching the deployment's public origin, for cookies/CORS) and
// the signing secret.
export function hasLocalAuthConfig() {
  try {
    getHostedBaseUrl();
    getHostedSecret();
    return true;
  } catch {
    return false;
  }
}

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  authInstance = createAuth();

  return authInstance;
}
