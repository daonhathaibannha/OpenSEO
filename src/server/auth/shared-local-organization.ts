import { AuthRepository } from "@/server/auth/repositories/AuthRepository";
import { slugify } from "./org-slug";

// Narrow callback shape (not the whole `auth.api` object) — matching
// default-hosted-organization.ts's HostedOrganizationCreator. Passing the
// full `auth.api` into this from within auth.ts's own `betterAuth({...})`
// initializer creates a circular type-inference error (`auth` referencing
// its own type before it's resolved); narrow callbacks sidestep that.
type CreateSharedOrganization = (input: {
  name: string;
  slug: string;
  userId: string;
}) => Promise<{ id: string } | null>;

type AddSharedOrganizationMember = (input: {
  userId: string;
  organizationId: string;
  role: "member";
}) => Promise<unknown>;

const SHARED_ORGANIZATION_NAME = "Team";
const SHARED_ORGANIZATION_SLUG = slugify(SHARED_ORGANIZATION_NAME);

/**
 * `local_auth` mode has exactly one organization shared by every
 * admin-created user (unlike `hosted`, where each user gets their own
 * Autumn-billed workspace) — this finds it, creates it on the very first
 * login (the seeded admin), or adds the calling user to it if it already
 * exists and they're not a member yet.
 */
export async function getOrCreateSharedLocalOrganization(
  userId: string,
  createOrganization: CreateSharedOrganization,
  addMember: AddSharedOrganizationMember,
): Promise<string> {
  const existingMembershipId =
    await AuthRepository.findFirstOrganizationIdForUser(userId);
  if (existingMembershipId) {
    return existingMembershipId;
  }

  const existingOrganizationId = await AuthRepository.findAnyOrganizationId();
  if (existingOrganizationId) {
    await addMember({
      userId,
      organizationId: existingOrganizationId,
      role: "member",
    });
    return existingOrganizationId;
  }

  const created = await createOrganization({
    name: SHARED_ORGANIZATION_NAME,
    slug: SHARED_ORGANIZATION_SLUG,
    userId,
  });

  if (created?.id) {
    return created.id;
  }

  // Lost a race with another concurrent first-login — re-check rather than
  // fail (mirrors default-hosted-organization.ts's retry-on-conflict shape).
  const organizationId = await AuthRepository.findAnyOrganizationId();
  if (organizationId) {
    return organizationId;
  }

  throw new Error("Failed to resolve shared local organization");
}
