import { z } from "zod";

const origin = z.url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && url.origin === value;
}, "Must be an exact HTTP(S) origin without a path or trailing slash");
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//),
  JWT_SECRET: z
    .string()
    .min(32)
    .refine(
      (value) =>
        !/replace-with|change[-_ ]?me|example|your[-_ ]?secret/i.test(value),
      "Replace example secret",
    ),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^[1-9]\d*[smhd]$/)
    .default("7d"),
  CLIENT_URL: origin,
  MAIL_MODE: z.enum(["preview", "smtp", "disabled"]).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.email().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SERVE_CLIENT: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});
export function parseEnvironment(input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid environment configuration: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`,
    );
  const env = result.data;
  const url = new URL(env.CLIENT_URL);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  env.MAIL_MODE ??= loopback ? "preview" : "disabled";
  if (env.MAIL_MODE === "preview" && !loopback)
    throw new Error(
      "Invalid environment configuration: mail previews require a loopback CLIENT_URL",
    );
  if (
    env.MAIL_MODE === "smtp" &&
    (!env.SMTP_HOST || !env.SMTP_FROM || !env.SMTP_USER || !env.SMTP_PASS)
  )
    throw new Error(
      "Invalid environment configuration: SMTP_HOST, SMTP_FROM, SMTP_USER and SMTP_PASS are required",
    );
  if (
    env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error(
      "Invalid environment configuration: CLIENT_URL must use HTTPS outside loopback in production",
    );
  }
  return env;
}
