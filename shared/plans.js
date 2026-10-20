export function planEntries(entries, selected) {
  const ids = new Set(selected);
  return entries.filter((entry) => entry.saved && ids.has(entry.slug));
}
