export const SCHEME_CATEGORIES = [
  { value: "agriculture", label: "Agriculture" },
  { value: "insurance", label: "Insurance" },
  { value: "pension", label: "Pensions" },
  { value: "banking", label: "Banking" },
  { value: "women-education", label: "Girls & education" },
];
export const SCHEME_LEVELS = [
  { value: "central", label: "Central schemes" },
  { value: "state", label: "State schemes" },
];
export const categoryLabel = (value) =>
  SCHEME_CATEGORIES.find((category) => category.value === value)?.label ||
  value;
export const formatReviewDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
