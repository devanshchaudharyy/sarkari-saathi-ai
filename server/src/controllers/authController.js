import bcrypt from "bcrypt";
import { z } from "zod";
import User, { safeUser } from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { HttpError } from "../middleware/errorMiddleware.js";
const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes.",
  );
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
});
const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1)
    .refine((v) => Buffer.byteLength(v, "utf8") <= 72),
});
function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0].message);
  return result.data;
}
export async function register(req, res) {
  const input = validate(registerSchema, req.body);
  if (await User.exists({ email: input.email }))
    throw new HttpError(409, "An account with this email already exists.");
  const user = await User.create({
    ...input,
    password: await bcrypt.hash(input.password, 12),
  });
  res
    .status(201)
    .json({ success: true, user: safeUser(user), token: generateToken(user) });
}
export async function login(req, res) {
  const input = validate(loginSchema, req.body);
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user || !(await bcrypt.compare(input.password, user.password)))
    throw new HttpError(401, "Invalid email or password");
  res.json({ success: true, user: safeUser(user), token: generateToken(user) });
}
export function me(req, res) {
  res.json({ success: true, user: safeUser(req.user) });
}
