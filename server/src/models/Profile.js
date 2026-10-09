import mongoose from "mongoose";
import {
  STATES_AND_UTS,
  OCCUPATIONS,
  MAX_INCOME,
} from "../../../shared/profile.js";
const integer = {
  validator: (value) => value === null || Number.isInteger(value),
  message: "Use a whole number.",
};
const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      immutable: true,
    },
    age: { type: Number, default: null, min: 0, max: 120, validate: integer },
    state: { type: String, default: null, enum: [...STATES_AND_UTS, null] },
    district: { type: String, default: "", trim: true, maxlength: 80 },
    occupation: {
      type: String,
      default: null,
      enum: [...OCCUPATIONS.map((option) => option.value), null],
    },
    annualHouseholdIncome: {
      type: Number,
      default: null,
      min: 0,
      max: MAX_INCOME,
      validate: integer,
    },
  },
  { timestamps: true },
);
export default mongoose.model("Profile", schema);
