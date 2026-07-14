import type { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";

export type EnsuredProject = NonNullable<
  Awaited<ReturnType<typeof ProjectRepository.getProjectForOrganization>>
>;

export type EnsuredUserContext = {
  userId: string;
  userEmail: string;
  // True when the user's email is verified (hosted) or auth is delegated
  // (Cloudflare Access / local), where there is no unverified state. Used to
  // gate paid onboarding spend behind verification.
  emailVerified: boolean;
  organizationId: string;
  // Better Auth admin-plugin role ("admin" | "user"), populated for
  // `hosted`/`local_auth` sessions. Undefined for delegated modes
  // (Cloudflare Access / local_noauth) — those have no per-user roles.
  role?: string;
  project?: EnsuredProject;
};
