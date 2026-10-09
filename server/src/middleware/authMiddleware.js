import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { HttpError } from "./errorMiddleware.js";
export default async function authMiddleware(req, res, next) {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || "");
  if (!match) throw new HttpError(401, "Please sign in to continue.");
  let payload;
  try {
    payload = jwt.verify(match[1], env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
  if (typeof payload !== "object" || !mongoose.isValidObjectId(payload.sub))
    throw new HttpError(401, "Invalid session. Please sign in again.");
  req.user = await User.findById(payload.sub);
  if (!req.user)
    throw new HttpError(401, "Invalid session. Please sign in again.");
  next();
}
