import { describe, expect, it, vi } from "vitest";

const { findFirstOrganizationIdForUser, findAnyOrganizationId } = vi.hoisted(
  () => ({
    findFirstOrganizationIdForUser: vi.fn(),
    findAnyOrganizationId: vi.fn(),
  }),
);

vi.mock("@/server/auth/repositories/AuthRepository", () => ({
  AuthRepository: { findFirstOrganizationIdForUser, findAnyOrganizationId },
}));

import { getOrCreateSharedLocalOrganization } from "@/server/auth/shared-local-organization";

describe("getOrCreateSharedLocalOrganization", () => {
  it("returns the user's existing membership without creating anything", async () => {
    findFirstOrganizationIdForUser.mockResolvedValue("org-existing");
    const createOrganization = vi.fn();
    const addMember = vi.fn();

    const result = await getOrCreateSharedLocalOrganization(
      "user-1",
      createOrganization,
      addMember,
    );

    expect(result).toBe("org-existing");
    expect(createOrganization).not.toHaveBeenCalled();
    expect(addMember).not.toHaveBeenCalled();
  });

  it("adds the user to the one existing shared org when they aren't a member yet", async () => {
    findFirstOrganizationIdForUser.mockResolvedValue(null);
    findAnyOrganizationId.mockResolvedValue("org-shared");
    const createOrganization = vi.fn();
    const addMember = vi.fn().mockResolvedValue(undefined);

    const result = await getOrCreateSharedLocalOrganization(
      "user-2",
      createOrganization,
      addMember,
    );

    expect(result).toBe("org-shared");
    expect(addMember).toHaveBeenCalledWith({
      userId: "user-2",
      organizationId: "org-shared",
      role: "member",
    });
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it("creates the shared org on the very first login", async () => {
    findFirstOrganizationIdForUser.mockResolvedValue(null);
    findAnyOrganizationId.mockResolvedValue(null);
    const createOrganization = vi.fn().mockResolvedValue({ id: "org-new" });
    const addMember = vi.fn();

    const result = await getOrCreateSharedLocalOrganization(
      "user-3",
      createOrganization,
      addMember,
    );

    expect(result).toBe("org-new");
    expect(createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-3", name: "Team" }),
    );
    expect(addMember).not.toHaveBeenCalled();
  });

  it("recovers by re-checking when createOrganization races another first login", async () => {
    findFirstOrganizationIdForUser.mockResolvedValue(null);
    findAnyOrganizationId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("org-from-winner");
    const createOrganization = vi.fn().mockResolvedValue(null);
    const addMember = vi.fn();

    const result = await getOrCreateSharedLocalOrganization(
      "user-4",
      createOrganization,
      addMember,
    );

    expect(result).toBe("org-from-winner");
  });
});
