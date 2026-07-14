import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, organization, user as authUser } from "@/db/schema";

type DelegatedOrganizationInput = {
  id: string;
  name: string;
  slug: string;
};

async function upsertDelegatedOrganization(input: DelegatedOrganizationInput) {
  await db
    .insert(organization)
    .values({
      id: input.id,
      name: input.name,
      slug: input.slug,
      logo: null,
      createdAt: new Date(),
      metadata: null,
    })
    .onConflictDoUpdate({
      target: organization.id,
      set: {
        name: input.name,
        slug: input.slug,
      },
    });
}

async function findFirstOrganizationIdForUser(userId: string) {
  const [existingMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1);

  return existingMembership?.organizationId ?? null;
}

async function getHostedUser(userId: string) {
  return db.query.user.findFirst({
    columns: {
      id: true,
      email: true,
      name: true,
    },
    where: eq(authUser.id, userId),
  });
}

// `local_auth` mode: everyone shares one organization, so there's only ever
// one row here — used to find it regardless of which user is asking.
async function findAnyOrganizationId() {
  const [existingOrganization] = await db
    .select({ id: organization.id })
    .from(organization)
    .orderBy(asc(organization.createdAt))
    .limit(1);

  return existingOrganization?.id ?? null;
}

export const AuthRepository = {
  upsertDelegatedOrganization,
  findFirstOrganizationIdForUser,
  findAnyOrganizationId,
  getHostedUser,
} as const;
