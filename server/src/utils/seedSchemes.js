import Scheme from "../models/Scheme.js";
import { catalog } from "../data/schemes.js";
export async function seedSchemes() {
  // Validate every record before writing; no deletion or changes to citizen data.
  const records = catalog.map((record) => ({
    ...record,
    searchText: [
      record.name,
      record.acronym,
      record.summary,
      ...record.keywords,
    ].join(" "),
  }));
  await Promise.all(records.map((record) => new Scheme(record).validate()));
  await Scheme.init();
  for (const record of records)
    await Scheme.updateOne(
      { slug: record.slug },
      { $set: record },
      { upsert: true, runValidators: true },
    );
  return records.length;
}
