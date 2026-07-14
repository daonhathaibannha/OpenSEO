import { z } from "zod";

type AuthMode = "cloudflare_access" | "local_noauth" | "hosted" | "local_auth";

const authModeSchema = z
  .enum(["cloudflare_access", "local_noauth", "hosted", "local_auth"])
  .catch("cloudflare_access");

export function getAuthMode(value: string | null | undefined): AuthMode {
  return authModeSchema.parse(value);
}

// True SaaS mode only: Autumn billing, Google OAuth requirement, Turnstile,
// disposable-email blocking, per-user org auto-provisioning. Deliberately
// narrow — `local_auth` (self-hosted, login-required) must NEVER match this,
// since every billing/credit gate in the app keys off it. See
// isLoginRequiredAuthMode() for "does this deployment require a session"
// (true for both `hosted` and `local_auth`).
export function isHostedAuthMode(value: string | null | undefined) {
  return getAuthMode(value) === "hosted";
}

export function isHostedClientAuthMode() {
  // This is an explicit deploy-time contract: the operator must keep the
  // client build-time AUTH_MODE aligned with the server runtime AUTH_MODE.
  // We accept that tradeoff to avoid a startup round-trip just to ask the
  // backend which auth UI to render. Hosted deployments must therefore set
  // AUTH_MODE=hosted in both the client build environment and the runtime.
  return isHostedAuthMode(import.meta.env.AUTH_MODE);
}

// Both `hosted` and `local_auth` are backed by a real Better Auth session
// (email/password), so both require a logged-in user before rendering app
// routes. Use this (not isHostedAuthMode) for route-guarding — it's the
// billing/SaaS-specific checks that must stay narrowly `hosted`-only.
export function isLoginRequiredAuthMode(value: string | null | undefined) {
  const mode = getAuthMode(value);
  return mode === "hosted" || mode === "local_auth";
}

export function isLoginRequiredClientMode() {
  return isLoginRequiredAuthMode(import.meta.env.AUTH_MODE);
}

// Distinguishes the two login-required UI variants: `hosted` shows
// Google/self-signup/email-based-reset; `local_auth` shows a bare
// email+password form only (admin-managed accounts, admin-driven resets).
export function getClientAuthUiMode(): "hosted" | "local_auth" | null {
  const mode = getAuthMode(import.meta.env.AUTH_MODE);
  if (mode === "hosted" || mode === "local_auth") return mode;
  return null;
}

export function isEmailVerificationBypassed() {
  // Local-dev escape hatch (BYPASS_EMAIL_VERIFICATION=true), plus local_auth
  // mode always (mirrors the server-side `bypassEmail` check in auth.ts — no
  // email service is configured there, so verification can never happen).
  // The client must treat the session as verified in both cases, otherwise
  // route guards and /verify-email bounce each other in a redirect loop.
  return (
    import.meta.env.BYPASS_EMAIL_VERIFICATION === "true" ||
    getAuthMode(import.meta.env.AUTH_MODE) === "local_auth"
  );
}
