import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export default (user) =>
  jwt.sign({ ver: user.sessionVersion ?? 0 }, env.JWT_SECRET, {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN,
  });
