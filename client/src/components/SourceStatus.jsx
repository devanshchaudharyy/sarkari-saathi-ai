import { useLanguage } from "../i18n/useLanguage";
export default function SourceStatus({ reliability }) {
  const { t, locale } = useLanguage();
  if (!reliability) return null;
  const day = (value) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(value + "T00:00:00Z"))
      : t("Not recorded");
  return (
    <aside
      className={`source-status source-${reliability.state}`}
      aria-label={t("Source review status")}
    >
      <strong>
        {t(
          reliability.state === "pending"
            ? "Source change reported — review pending"
            : reliability.state === "due"
              ? "Editorial review is due"
              : "Editorial review recorded",
        )}
      </strong>
      <p>
        {t(
          reliability.state === "pending"
            ? "A report is awaiting human review. Existing screening, checklists and document guides are paused; published catalog text may be out of date."
            : reliability.state === "due"
              ? "The scheduled review date has passed. Confirm current requirements with the official provider."
              : "This is a project editorial review, not a government confirmation or a live policy check.",
        )}
      </p>
      <small>
        {t("Catalog reviewed")}: {day(reliability.reviewedAt)} ·{" "}
        {t("Next editorial review")}: {day(reliability.nextReviewAt)}
      </small>
      {reliability.sourceVersion && (
        <p>
          {t("Reviewed source label")}: {reliability.sourceVersion.label}
        </p>
      )}
    </aside>
  );
}
