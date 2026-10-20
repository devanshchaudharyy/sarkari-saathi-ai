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
