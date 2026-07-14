import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { UserManagementService } from "@/server/features/userManagement/services/UserManagementService";
import { requireAdminContext } from "@/serverFunctions/middleware";
import {
  createManagedUserSchema,
  removeManagedUserSchema,
  resetManagedUserPasswordSchema,
} from "@/types/schemas/userManagement";

export const listManagedUsers = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .handler(async ({ context }) =>
    UserManagementService.listUsers(context.organizationId),
  );

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(createManagedUserSchema)
  .handler(async ({ data }) => UserManagementService.createUser(data));

export const resetManagedUserPassword = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(resetManagedUserPasswordSchema)
  .handler(async ({ data }) =>
    UserManagementService.resetPassword(getRequest().headers, data),
  );

export const removeManagedUser = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(removeManagedUserSchema)
  .handler(async ({ data, context }) =>
    UserManagementService.removeUser(
      getRequest().headers,
      context.organizationId,
      {
        userId: data.userId,
        requestingUserId: context.userId,
      },
    ),
  );
