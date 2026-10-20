export const APPLICATION_STATUSES = [
  { value: "preparing", label: "Preparing" },
  { value: "submitted", label: "Submitted" },
  { value: "awaiting_response", label: "Awaiting response" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
export const applicationLabel = (value) =>
  APPLICATION_STATUSES.find((item) => item.value === value)?.label || value;
export function validDay(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
