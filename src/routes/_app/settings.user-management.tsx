import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AddUserButton } from "@/client/features/userManagement/AddUserButton";
import { UsersTable } from "@/client/features/userManagement/UsersTable";
import { USERS_QUERY_KEY } from "@/client/features/userManagement/types";
import { getErrorCode } from "@/client/lib/error-messages";
import { useSession } from "@/lib/auth-client";
import { listManagedUsers } from "@/serverFunctions/userManagement";

export const Route = createFileRoute("/_app/settings/user-management")({
  component: UserManagementPage,
});

function UserManagementPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  // The client-side session hook can briefly report stale/empty data right
  // after a route transition (this is a leaf route, so it re-mounts on every
  // navigation here) — rather than gate on that, let the server's own
  // requireAdminContext check (via this query's FORBIDDEN error) be the
  // actual source of truth for "not allowed here."
  const usersQuery = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => listManagedUsers(),
    retry: false,
  });
  const isForbidden = getErrorCode(usersQuery.error) === "FORBIDDEN";

  useEffect(() => {
    if (isForbidden) {
      void navigate({ to: "/settings", replace: true });
    }
  }, [isForbidden, navigate]);

  if (isForbidden) {
    return null;
  }

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-12 md:pb-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="mt-1 text-sm text-base-content/60">
              Add or remove accounts for this deployment. Everyone shares the
              same workspace.
            </p>
          </div>
          <AddUserButton
            existingEmails={usersQuery.data?.map((user) => user.email) ?? []}
          />
        </div>

        <UsersTable
          users={usersQuery.data}
          isLoading={usersQuery.isPending}
          currentUserId={session?.user?.id}
        />
      </div>
    </div>
  );
}
