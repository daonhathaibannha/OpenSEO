import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, user as authUser } from "@/db/schema";

type ManagedUserRow = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
};

async function listOrganizationMembers(
  organizationId: string,
): Promise<ManagedUserRow[]> {
  return db
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      banned: authUser.banned,
      createdAt: authUser.createdAt,
    })
    .from(member)
    .innerJoin(authUser, eq(member.userId, authUser.id))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(authUser.createdAt));
}

// Guards "don't remove/demote the last admin" — counts admin-role members
// within one organization, not globally (mirrors the shared-org model).
async function countOrganizationAdmins(
  organizationId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(member)
    .innerJoin(authUser, eq(member.userId, authUser.id))
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(authUser.role, "admin"),
      ),
    );

  return row?.count ?? 0;
}

export const UserManagementRepository = {
  listOrganizationMembers,
  countOrganizationAdmins,
} as const;
