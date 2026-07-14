import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { Modal } from "@/client/components/Modal";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
import { resetManagedUserPassword } from "@/serverFunctions/userManagement";
import type { ManagedUser } from "./types";

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(
      HOSTED_PASSWORD_MIN_LENGTH,
      `Password must be at least ${HOSTED_PASSWORD_MIN_LENGTH} characters.`,
    )
    .max(
      HOSTED_PASSWORD_MAX_LENGTH,
      `Password must be at most ${HOSTED_PASSWORD_MAX_LENGTH} characters.`,
    ),
});

export function ResetPasswordModal({
  user,
  onClose,
}: {
  user: ManagedUser;
  onClose: () => void;
}) {
  const form = useForm({
    defaultValues: { newPassword: "" },
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: async ({ formApi, value }) => {
      try {
        await resetManagedUserPassword({
          data: { userId: user.id, newPassword: value.newPassword },
        });
        toast.success(`Password reset for ${user.email}`);
        onClose();
      } catch (error) {
        formApi.setErrorMap({
          onSubmit: {
            form: getStandardErrorMessage(error, "Failed to reset password."),
            fields: {},
          },
        });
      }
    },
  });

  return (
    <Modal
      maxWidth="max-w-sm"
      labelledBy="reset-password-title"
      onClose={onClose}
    >
      <h2 id="reset-password-title" className="card-title text-lg">
        Reset password for {user.email}
      </h2>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="newPassword">
          {(field) => {
            const error = getFieldError(field.state.meta.errors);
            return (
              <div>
                <label className="label text-sm">New password</label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={HOSTED_PASSWORD_MIN_LENGTH}
                  maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                />
                {error ? (
                  <p className="mt-1 text-sm text-error">{error}</p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            submitError: state.errorMap.onSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ submitError, isSubmitting }) => {
            const errorMessage = getFormError(submitError);
            return (
              <>
                {errorMessage ? (
                  <p className="text-sm text-error">{errorMessage}</p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Reset password"}
                  </button>
                </div>
              </>
            );
          }}
        </form.Subscribe>
      </form>
    </Modal>
  );
}
