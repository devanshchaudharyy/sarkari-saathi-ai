import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    slug: { type: String, required: true, immutable: true },
    templateVersion: { type: String, required: true },
    completedIds: { type: [String], default: [] },
    revision: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
schema.index({ user: 1, slug: 1 }, { unique: true });
export default mongoose.model("SavedScheme", schema);
