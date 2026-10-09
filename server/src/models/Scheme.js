import mongoose from "mongoose";
import { SCHEME_CATEGORIES } from "../../../shared/schemes.js";
const officialUrl = {
  type: String,
  required: true,
  validate: (value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.hostname.endsWith(".gov.in")
      );
    } catch {
      return false;
    }
  },
};
const schemeSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    name: { type: String, required: true },
    acronym: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: SCHEME_CATEGORIES.map(({ value }) => value),
    },
    level: { type: String, enum: ["central", "state"], required: true },
    states: [String],
    authority: { type: String, required: true },
    summary: { type: String, required: true },
    benefitLabel: { type: String, required: true },
    benefitNote: { type: String, required: true },
    benefits: [String],
    eligibility: [String],
    applicationSteps: [String],
    caveats: [String],
    officialUrl,
    sources: [
      { _id: false, title: { type: String, required: true }, url: officialUrl },
    ],
    keywords: [String],
    searchText: { type: String, required: true },
    reviewedAt: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true },
);
schemeSchema.index({ category: 1, level: 1, name: 1 });
export default mongoose.model("Scheme", schemeSchema);
