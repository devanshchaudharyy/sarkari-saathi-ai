import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export default (user) =>
  jwt.sign({}, env.JWT_SECRET, {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN,
  });
