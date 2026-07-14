import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { removeManagedUser } from "@/serverFunctions/userManagement";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { USERS_QUERY_KEY, type ManagedUser } from "./types";

export function UsersTable({
  users,
  isLoading,
  currentUserId,
}: {
  users: ManagedUser[] | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
}) {
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeManagedUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("User removed");
      void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getStandardErrorMessage(error, "Failed to remove user."));
    },
  });

  if (isLoading) {
    return <div className="text-sm text-base-content/60">Loading...</div>;
  }

  if (!users || users.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body items-center text-center text-sm text-base-content/60">
          No users yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Created</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="font-medium">{user.email}</td>
              <td>{user.name}</td>
              <td>
                <span
                  className={`badge badge-sm ${user.role === "admin" ? "badge-primary" : "badge-ghost"}`}
                >
                  {user.role === "admin" ? "Admin" : "User"}
                </span>
              </td>
              <td className="text-base-content/60">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setResetTarget(user)}
                  >
                    <KeyRound className="size-3.5" />
                    Reset password
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    disabled={
                      user.id === currentUserId || removeMutation.isPending
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove ${user.email}? This cannot be undone.`,
                        )
                      ) {
                        removeMutation.mutate(user.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {resetTarget ? (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      ) : null}
    </div>
  );
}
