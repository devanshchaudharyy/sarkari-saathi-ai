import Scheme from "../models/Scheme.js";
import { LIVE_CATALOG } from "../../../shared/catalog.js";
import { documentGuideFor } from "../domain/documents.js";
import { slugSchema, parseInput, noQuery } from "../utils/input.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export async function getDocuments(req, res) {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug);
  const scheme = await Scheme.findOne({ slug, ...LIVE_CATALOG })
    .select("slug name acronym officialUrl readinessSuspended")
    .lean();
  if (!scheme)
    throw new HttpError(404, "Scheme not found in the current catalog.");
  res.json({
    success: true,
    scheme: {
      slug: scheme.slug,
      name: scheme.name,
      acronym: scheme.acronym,
      officialUrl: scheme.officialUrl,
    },
    guide: documentGuideFor(scheme),
  });
}
