import { z } from "zod";
import { CATALOG_FIELDS, officialSourceUrl } from "../../../shared/catalog.js";
import { SCHEME_CATEGORIES } from "../../../shared/schemes.js";
import { STATES_AND_UTS } from "../../../shared/profile.js";
import { validDay, todayInIndia } from "../../../shared/applications.js";
const short = z.string().trim().min(1).max(180),
  long = z.string().trim().min(1).max(1500),
  lines = z.array(long).min(1).max(15),
  url = z.string().max(2000).refine(officialSourceUrl);
export const catalogInput = z
  .strictObject({
    slug: z
      .string()
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: short,
    acronym: z.string().trim().min(1).max(32),
    category: z.enum(SCHEME_CATEGORIES.map((item) => item.value)),
    level: z.enum(["central", "state"]),
    states: z.array(z.enum(STATES_AND_UTS)).max(36),
    authority: short,
    summary: long,
    benefitLabel: short,
    benefitNote: long,
    benefits: lines,
    eligibility: lines,
    applicationSteps: lines,
    caveats: lines,
    officialUrl: url,
    sources: z
      .array(z.strictObject({ title: short, url }))
      .min(1)
      .max(10),
    keywords: z.array(z.string().trim().min(1).max(80)).max(20),
    reviewedAt: z
      .string()
      .refine(
        (value) =>
          validDay(value) && value >= "2000-01-01" && value <= todayInIndia(),
      ),
  })
  .refine(
    (value) =>
      value.level === "central"
        ? value.states.length === 0
        : value.states.length > 0,
    "Choose state coverage for a state scheme; central schemes use no state restriction.",
  );
export const searchTextFor = (data) =>
  [data.name, data.acronym, data.summary, ...data.keywords].join(" ");
export const publicProjection = (PUBLIC) => PUBLIC.join(" ") + " -_id";
export { CATALOG_FIELDS };
