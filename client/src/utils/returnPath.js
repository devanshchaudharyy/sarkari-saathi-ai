export function safeReturnPath(value) {
  if (
    typeof value !== "string" ||
    value.length > 300 ||
    !value.startsWith("/") ||
    value.includes("\\")
  )
    return "/dashboard";
  try {
    const url = new URL(value, "https://internal.invalid");
    if (
      url.origin !== "https://internal.invalid" ||
      !["/dashboard", "/profile", "/eligibility", "/readiness"].includes(
        url.pathname,
      )
    )
      return "/dashboard";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/dashboard";
  }
}
