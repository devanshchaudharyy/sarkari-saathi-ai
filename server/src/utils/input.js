import { z } from "zod";
import { HttpError } from "../middleware/errorMiddleware.js";
export const slugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const versionInput = {
  id: z.string().regex(/^[a-f0-9]{24}$/),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
};
export function parseInput(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      "Send only the supported fields with valid values.",
    );
  return result.data;
}
export function noQuery(req) {
  if (Object.keys(req.query).length)
    throw new HttpError(400, "This endpoint does not accept query parameters.");
}
export const conflict = () =>
  new HttpError(
    409,
    "This record changed in another window. Reload before making another change.",
  );
