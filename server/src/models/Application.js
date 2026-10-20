import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../../../shared/applications.js";
const event = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: APPLICATION_STATUSES.map((item) => item.value),
      required: true,
    },
    occurredOn: { type: String, required: true },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
);
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
    status: {
      type: String,
      enum: APPLICATION_STATUSES.map((item) => item.value),
      default: "preparing",
    },
    revision: { type: Number, default: 0 },
    events: { type: [event], required: true },
  },
  { timestamps: true },
);
schema.index({ user: 1, slug: 1 }, { unique: true });
export default mongoose.model("Application", schema);
