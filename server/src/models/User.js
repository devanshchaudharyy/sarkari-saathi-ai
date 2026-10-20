import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: { type: String, required: true, select: false },
    sessionVersion: { type: Number, default: 0, select: false },
    emailVerifiedAt: { type: Date, default: null, select: false },
    deletingAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);
export const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
export default mongoose.model("User", schema);
