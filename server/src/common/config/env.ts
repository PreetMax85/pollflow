import { z } from "zod";
import "dotenv/config";

/**
 * Every environment variable the server needs is declared and validated here
 * using Zod at startup. If anything is missing or malformed, the process exits
 * immediately with a clear error message before accepting any traffic.
 */
const envSchema = z.object({
  PORT: z.coerce.number(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (uri) => uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a valid MongoDB connection string",
    ),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL (e.g. https://pollflow.jdevs.codes)"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10, "BCRYPT_SALT_ROUNDS must be at least 10"),
  RESEND_API_KEY: z.string().default(""),
});

// Parse throws a ZodError with a detailed message if validation fails.
// We intentionally do NOT catch it — let the process crash with a clear log.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("──────────────────────────────────────────────────────────");
  console.error("[ENV] ❌  Environment validation failed. Server cannot start.");
  console.error("──────────────────────────────────────────────────────────");
  parsed.error.issues.forEach((issue) => {
    console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
  });
  console.error("──────────────────────────────────────────────────────────");
  console.error("[ENV] Check your .env file against .env.example and retry.");
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
