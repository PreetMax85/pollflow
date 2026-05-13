import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
const passwordMessage = "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long").max(255, "Name must be at most 255 characters long"),
  email: z.email({ message: "Invalid email address format" }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(passwordRegex, { message: passwordMessage }),
});

export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address format" }),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email address format" }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").max(512, "Invalid token"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(passwordRegex, { message: passwordMessage }),
});


export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;