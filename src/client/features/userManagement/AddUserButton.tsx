import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Modal } from "@/client/components/Modal";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
import { createManagedUser } from "@/serverFunctions/userManagement";
import { USERS_QUERY_KEY } from "./types";

const addUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  name: z.string().trim().min(1, "Enter a full name."),
  password: z
    .string()
    .min(
      HOSTED_PASSWORD_MIN_LENGTH,
      `Password must be at least ${HOSTED_PASSWORD_MIN_LENGTH} characters.`,
    )
    .max(
      HOSTED_PASSWORD_MAX_LENGTH,
      `Password must be at most ${HOSTED_PASSWORD_MAX_LENGTH} characters.`,
    ),
  isAdmin: z.boolean(),
});

export function AddUserButton({
  existingEmails,
}: {
  existingEmails: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: { email: "", name: "", password: "", isAdmin: false },
    validators: { onSubmit: addUserSchema },
    onSubmit: async ({ formApi, value }) => {
      const email = value.email.trim();
      if (existingEmails.includes(email)) {
        formApi.setErrorMap({
          onSubmit: {
            form: "A user with this email already exists.",
            fields: {},
          },
        });
        return;
      }
      try {
        await createManagedUser({
          data: {
            email,
            name: value.name.trim(),
            password: value.password,
            isAdmin: value.isAdmin,
          },
        });
        toast.success("User created");
        void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        setIsOpen(false);
        form.reset();
      } catch (error) {
        formApi.setErrorMap({
          onSubmit: {
            form: getStandardErrorMessage(error, "Failed to create user."),
            fields: {},
          },
        });
      }
    },
  });

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => setIsOpen(true)}
      >
        <UserPlus className="size-4" />
        Add user
      </button>

      {isOpen ? (
        <Modal
          maxWidth="max-w-sm"
          labelledBy="add-user-title"
          onClose={() => setIsOpen(false)}
        >
          <h2 id="add-user-title" className="card-title text-lg">
            Add user
          </h2>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Field name="email">
              {(field) => {
                const error = getFieldError(field.state.meta.errors);
                return (
                  <div>
                    <label className="label text-sm">Email</label>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                      required
                    />
                    {error ? (
                      <p className="mt-1 text-sm text-error">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="name">
              {(field) => {
                const error = getFieldError(field.state.meta.errors);
                return (
                  <div>
                    <label className="label text-sm">Full name</label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                      required
                    />
                    {error ? (
                      <p className="mt-1 text-sm text-error">{error}</p>
                    ) : null}
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const error = getFieldError(field.state.meta.errors);
                return (
                  <div>
                    <label className="label text-sm">Password</label>
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

            <form.Field name="isAdmin">
              {(field) => (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  Grant admin access
                </label>
              )}
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
                        onClick={() => setIsOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating..." : "Add user"}
                      </button>
                    </div>
                  </>
                );
              }}
            </form.Subscribe>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
