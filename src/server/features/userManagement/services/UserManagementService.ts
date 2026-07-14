import { APIError } from "better-auth/api";
import { getAuth } from "@/lib/auth";
import { AppError } from "@/server/lib/errors";
import { UserManagementRepository } from "@/server/features/userManagement/repositories/UserManagementRepository";

function toAppError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof APIError) {
    if (error.status === "FORBIDDEN" || error.status === "UNAUTHORIZED") {
      return new AppError("FORBIDDEN", error.message);
    }
    if (error.status === "BAD_REQUEST") {
      // Better Auth's own message is specific enough to show as-is (e.g.
      // "email already exists", "password too short").
      return new AppError("CONFLICT", error.message || fallbackMessage);
    }
    return new AppError("INTERNAL_ERROR", error.message || fallbackMessage);
  }
  return new AppError("INTERNAL_ERROR", fallbackMessage);
}

async function listUsers(organizationId: string) {
  return UserManagementRepository.listOrganizationMembers(organizationId);
}

async function createUser(input: {
  email: string;
  name: string;
  password: string;
  isAdmin: boolean;
}) {
  try {
    // Headerless call = a trusted system action (see admin plugin's
    // createUser: it only enforces a caller-permission check when headers/a
    // request are present). requireAdminContext already verified the caller
    // is an admin before this ran. emailVerified: true because admin-created
    // accounts have no email service to verify through.
    const result = await getAuth().api.createUser({
      body: {
        email: input.email,
        name: input.name,
        password: input.password,
        role: input.isAdmin ? "admin" : "user",
        data: { emailVerified: true },
      },
    });
    return result.user;
  } catch (error) {
    throw toAppError(error, "Failed to create user");
  }
}

async function resetPassword(
  headers: Headers,
  input: { userId: string; newPassword: string },
) {
  try {
    // Unlike createUser, setUserPassword always requires a real admin
    // session (better-auth's adminMiddleware reads it directly, no
    // headerless system-action path) — forward the caller's own headers.
    await getAuth().api.setUserPassword({
      headers,
      body: { userId: input.userId, newPassword: input.newPassword },
    });
  } catch (error) {
    throw toAppError(error, "Failed to reset password");
  }
}

async function removeUser(
  headers: Headers,
  organizationId: string,
  input: { userId: string; requestingUserId: string },
) {
  if (input.userId === input.requestingUserId) {
    throw new AppError("CONFLICT", "You cannot remove your own account.");
  }

  const admins =
    await UserManagementRepository.countOrganizationAdmins(organizationId);
  const members =
    await UserManagementRepository.listOrganizationMembers(organizationId);
  const target = members.find((member) => member.id === input.userId);
  if (target?.role === "admin" && admins <= 1) {
    throw new AppError(
      "CONFLICT",
      "Cannot remove the last remaining admin account.",
    );
  }

  try {
    // Same as setUserPassword — requires the caller's real session headers.
    await getAuth().api.removeUser({
      headers,
      body: { userId: input.userId },
    });
  } catch (error) {
    throw toAppError(error, "Failed to remove user");
  }
}

export const UserManagementService = {
  listUsers,
  createUser,
  resetPassword,
  removeUser,
} as const;
