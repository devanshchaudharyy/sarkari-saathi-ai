import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    role: { type: String, enum: ["editor", "admin"], required: true },
  },
  { timestamps: true },
);
export default mongoose.model("StaffAccess", schema);
