import { z } from "zod";
import Profile from "../models/Profile.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import {
  STATES_AND_UTS,
  OCCUPATIONS,
  MAX_INCOME,
  emptyProfile,
  profileCompletion,
} from "../../../shared/profile.js";
const schema = z.strictObject({
  age: z.number().int("Age must be a whole number.").min(0).max(120).nullable(),
  state: z.enum(STATES_AND_UTS).nullable(),
  district: z
    .string()
    .trim()
    .max(80)
    .refine(
      (value) => value.length === 0 || value.length >= 2,
      "District must contain at least 2 characters.",
    )
    .default(""),
  occupation: z.enum(OCCUPATIONS.map((option) => option.value)).nullable(),
  annualHouseholdIncome: z
    .number()
    .int("Income must be a whole number of rupees.")
    .min(0)
    .max(MAX_INCOME)
    .nullable(),
});
function response(profile) {
  const fields = emptyProfile();
  if (profile)
    for (const key of Object.keys(fields))
      fields[key] = profile[key] ?? fields[key];
  return {
    success: true,
    profile: {
      ...fields,
      createdAt: profile?.createdAt || null,
      updatedAt: profile?.updatedAt || null,
    },
    completion: profileCompletion(fields),
  };
}
export async function getProfile(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(response(await Profile.findOne({ user: req.user._id })));
}
export async function saveProfile(req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    throw new HttpError(
      400,
      `Please check your profile details. ${parsed.error.issues[0].message}`,
    );
  // The owner always comes from verified authentication, never from the body.
  let profile;
  try {
    profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: parsed.data },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    profile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: parsed.data },
      { new: true, runValidators: true },
    );
    if (!profile) throw error;
  }
  res.set("Cache-Control", "no-store");
  res.json(response(profile));
}
