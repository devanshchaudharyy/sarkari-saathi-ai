export function comparisonSelection(params, known) {
  const values = params.getAll("schemes");
  if ([...params.keys()].some((key) => key !== "schemes") || values.length > 1)
    return { slugs: [], invalid: true };
  if (!values.length || !values[0]) return { slugs: [], invalid: false };
  const slugs = values[0].split(",");
  const invalid =
    slugs.length > 3 ||
    new Set(slugs).size !== slugs.length ||
    slugs.some(
      (value) =>
        value.length > 100 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ||
        (known && !known.includes(value)),
    );
  return { slugs: invalid ? [] : slugs, invalid };
}
export function comparisonQuery(slugs) {
  return slugs.length ? { schemes: slugs.join(",") } : {};
}
