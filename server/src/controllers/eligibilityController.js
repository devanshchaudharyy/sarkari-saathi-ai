import { z } from "zod";
import Profile from "../models/Profile.js";
import Scheme from "../models/Scheme.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import {
  QUESTIONS,
  UP_STAGES,
  RULE_VERSION,
  RULE_REVIEWED_AT,
  assessSchemes,
} from "../domain/eligibility.js";
const answerSchema = z.strictObject(
  Object.fromEntries(
    QUESTIONS.map((question) => [
      question.key,
      (question.type === "stage"
        ? z.enum(UP_STAGES.map((stage) => stage.value))
        : z.boolean()
      )
        .nullable()
        .optional(),
    ]),
  ),
);
const schema = z.strictObject({ answers: answerSchema });
async function respond(req, res, answers) {
  const [profile, schemes] = await Promise.all([
    Profile.findOne({ user: req.user._id })
      .select("age state annualHouseholdIncome updatedAt -_id")
      .lean(),
    Scheme.find()
      .select("slug name acronym category level -_id")
      .sort({ name: 1, slug: 1 })
      .maxTimeMS(5000)
      .lean(),
  ]);
  const results = assessSchemes(schemes, profile || {}, answers);
  const counts = {
    basic_match: 0,
    needs_info: 0,
    criteria_not_met: 0,
    not_assessed: 0,
  };
  for (const result of results) counts[result.assessment.status]++;
  res.set("Cache-Control", "no-store").json({
    success: true,
    profile: {
      age: profile?.age ?? null,
      state: profile?.state ?? null,
      annualHouseholdIncome: profile?.annualHouseholdIncome ?? null,
      updatedAt: profile?.updatedAt ?? null,
    },
    questions: QUESTIONS.filter((question) =>
      schemes.some((scheme) => question.schemes.includes(scheme.slug)),
    ),
    results,
    counts,
    ruleVersion: RULE_VERSION,
    reviewedAt: RULE_REVIEWED_AT,
    checkedAt: new Date().toISOString(),
  });
}
export async function getEligibility(req, res) {
  await respond(req, res, {});
}
export async function checkEligibility(req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Send only supported screening answers as Yes/No (boolean), Not sure (null), or a valid UP stage. Profile details must be edited in your profile.",
    );
  await respond(req, res, parsed.data.answers);
}
