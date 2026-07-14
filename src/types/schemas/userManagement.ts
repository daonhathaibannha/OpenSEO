import { z } from "zod";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";

const passwordSchema = z
  .string()
  .min(
    HOSTED_PASSWORD_MIN_LENGTH,
    `Password must be at least ${HOSTED_PASSWORD_MIN_LENGTH} characters.`,
  )
  .max(
    HOSTED_PASSWORD_MAX_LENGTH,
    `Password must be at most ${HOSTED_PASSWORD_MAX_LENGTH} characters.`,
  );

export const createManagedUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  name: z.string().trim().min(1, "Enter a full name."),
  password: passwordSchema,
  isAdmin: z.boolean().default(false),
});

export const resetManagedUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: passwordSchema,
});

export const removeManagedUserSchema = z.object({
  userId: z.string().min(1),
});
