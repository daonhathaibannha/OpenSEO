import { getAuth, hasLocalAuthConfig } from "@/lib/auth";
import { getActiveOrganizationId } from "@/lib/auth-session";
import { getOrCreateSharedLocalOrganization } from "@/server/auth/shared-local-organization";
import { getUserRole } from "@/server/auth/session-role";
import { AppError } from "@/server/lib/errors";
import type { EnsuredUserContext } from "./types";

async function requireLocalAuthSession(headers: Headers) {
  if (!hasLocalAuthConfig()) {
    throw new AppError(
      "AUTH_CONFIG_MISSING",
      "Missing Better Auth local_auth configuration",
    );
  }

  const session = await getAuth().api.getSession({ headers });

  if (!session?.user?.id || !session.user.email) {
    throw new AppError("UNAUTHENTICATED");
  }

  return session;
}

// Same session-resolution shape as resolveHostedContext, but every user
// shares one organization (getOrCreateSharedLocalOrganization) instead of
// getting their own Autumn-billed workspace.
export async function resolveLocalAuthContext(
  headers: Headers,
): Promise<EnsuredUserContext> {
  const session = await requireLocalAuthSession(headers);
  const activeOrganizationId = getActiveOrganizationId(session);

  if (activeOrganizationId) {
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      emailVerified: session.user.emailVerified ?? false,
      organizationId: activeOrganizationId,
      role: getUserRole(session.user),
    };
  }

  const authApi = getAuth().api;
  const organizationId = await getOrCreateSharedLocalOrganization(
    session.user.id,
    (body) => authApi.createOrganization({ body }),
    (body) => authApi.addMember({ body }),
  );

  await authApi.setActiveOrganization({
    headers,
    body: { organizationId },
  });

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    emailVerified: session.user.emailVerified ?? false,
    organizationId,
    role: getUserRole(session.user),
  };
}
