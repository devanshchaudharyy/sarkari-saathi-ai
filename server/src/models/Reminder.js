import mongoose from "mongoose";
import { REMINDER_KINDS } from "../../../shared/reminders.js";
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
      ref: "User",
    },
    slug: { type: String, required: true, immutable: true },
    name: { type: String, required: true },
    acronym: { type: String, required: true },
    kind: {
      type: String,
      required: true,
      enum: REMINDER_KINDS.map((item) => item.value),
      immutable: true,
    },
    dueOn: { type: String, required: true },
    completedAt: { type: Date, default: null },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ user: 1, slug: 1, kind: 1 }, { unique: true });
export default mongoose.model("Reminder", schema);
