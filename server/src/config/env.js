import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default("7d"),
  CLIENT_URL: z.url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid environment configuration: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
export const env = result.data;
