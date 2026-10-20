import { useEffect, useState } from "react";
import { Printer, RotateCcw } from "lucide-react";
import useReadiness from "../hooks/useReadiness";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
import Button from "../components/Button";
import { planEntries } from "../../../shared/plans.js";
import { formatReviewDate } from "../../../shared/schemes.js";
export default function PreparationPlan() {
  const { user } = useAuth();
  return <Plan key={user.id} user={user} />;
}
function Plan({ user }) {
  const { t, locale } = useLanguage(),
    resource = useReadiness(),
    [selected, setSelected] = useState(null),
    [includeName, setIncludeName] = useState(false);
  const saved = resource.entries.filter((row) => row.saved),
    choices = selected ?? saved.map((row) => row.slug),
    rows = planEntries(resource.entries, choices);
  useEffect(() => {
    document.body.classList.add("preparation-plan-view");
    return () => document.body.classList.remove("preparation-plan-view");
  }, []);
  return (
    <div className="organizer-page plan-page page-enter">
      <header className="plan-controls">
        <span className="eyebrow">
          <Printer size={16} />
          {t("TAKE YOUR NEXT STEPS WITH YOU")}
        </span>
        <h1>{t("Your preparation plan.")}</h1>
        <p>
          {t(
            "Print selected saved schemes, confirmed checklist progress and official next steps. Your browser can also save the printout as a PDF.",
          )}
        </p>
      </header>
      <section className="organizer-panel plan-controls">
        <h2>{t("Choose what to include")}</h2>
        {resource.loading ? (
          <p role="status">{t("Loading your records…")}</p>
        ) : resource.error ? (
          <p role="alert" className="organizer-error">
            {t(resource.error)}
          </p>
        ) : !saved.length ? (
          <p>{t("Save a scheme in Preparation before creating your plan.")}</p>
        ) : (
          <fieldset>
            <legend>{t("Saved schemes to print")}</legend>
            {saved.map((row) => (
              <label className="plan-checkbox" key={row.slug}>
                <input
                  type="checkbox"
                  checked={choices.includes(row.slug)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...choices, row.slug]
                        : choices.filter((slug) => slug !== row.slug),
                    )
                  }
                />
                {t(row.name)}
              </label>
            ))}
          </fieldset>
        )}
        <label className="plan-checkbox">
          <input
            type="checkbox"
            checked={includeName}
            onChange={(event) => setIncludeName(event.target.checked)}
          />
          {t("Include my name on the plan")}
        </label>
        <p>
          {t(
            "Email, profile details, application timelines and reminders are not included. Review the preview before printing; the selected scheme list resets on refresh.",
          )}
        </p>
        <div className="organizer-actions">
          <Button
            disabled={resource.loading || !!resource.error || !rows.length}
            onClick={() => window.print()}
          >
            <Printer size={16} />
            {t("Print / save PDF")}
          </Button>
          <Button
            variant="ghost"
            disabled={resource.loading}
            onClick={resource.reload}
          >
            <RotateCcw size={16} />
            {t("Reload saved progress")}
          </Button>
          <Button variant="secondary" to="/readiness">
            {t("Back to preparation")}
          </Button>
        </div>
      </section>
      {!resource.loading && !resource.error && rows.length > 0 && (
        <section
          className="plan-print"
          aria-label={t("Preparation plan preview")}
        >
          <header>
            <span className="eyebrow">SarkariSaathi</span>
            <h2>{t("Personal preparation plan")}</h2>
            {includeName && (
              <p className="plan-owner">
                {t("Prepared for")}: {user.name}
              </p>
            )}
            <p>
              {t("Prepared on")}{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "long",
                timeZone: "Asia/Kolkata",
              }).format(new Date())}
            </p>
            <p className="organizer-notice">
              {t(
                "Independent project, not an official government service. Progress below is self-marked preparation, not verified documents, eligibility, an application or approval. Confirm current complete requirements with the official provider.",
              )}
            </p>
          </header>
          {rows.map((row) => (
            <article className="organizer-panel plan-entry" key={row.slug}>
              <h3>
                {t(row.name)} <small>({row.acronym})</small>
              </h3>
              {!row.available ? (
                <p>
                  {t(
                    "This scheme is unavailable in the current catalog. No checklist guidance is invented.",
                  )}
                </p>
              ) : !row.items.length ? (
                <p>
                  {t(
                    "No reviewed preparation checklist is available for this scheme yet.",
                  )}
                </p>
              ) : (
                <>
                  <p>
                    {t("{0} of {1} listed tasks self-marked complete", [
                      row.progress.completed,
                      row.progress.total,
                    ])}
                  </p>
                  <p>
                    {t("Checklist reviewed")}:{" "}
                    {formatReviewDate(row.reviewedAt, locale)} ·{" "}
                    {row.templateVersion}
                  </p>
                  <ol className="plan-tasks">
                    {row.items.map((item) => (
                      <li key={item.id}>
                        <strong>
                          {item.completed ? "[x]" : "[ ]"} {t(item.title)}
                        </strong>
                        <p>{t(item.detail)}</p>
                        <a
                          href={item.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(item.source.title)}
                        </a>
                        <span className="plan-source-url">
                          {item.source.url}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {row.updatedAt && (
                <p>
                  {t("Saved progress updated")}{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(row.updatedAt))}
                </p>
              )}
              {row.officialUrl && (
                <p>
                  {t("Official next steps")}:{" "}
                  <a
                    href={row.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {row.officialUrl}
                  </a>
                </p>
              )}
            </article>
          ))}
          <footer>
            <p>
              {t(
                "Preparation guides are partial and may change. Reload saved progress before printing if you have edited it in another window. Keep your exported copy private if it contains your name.",
              )}
            </p>
          </footer>
        </section>
      )}
      {!resource.loading &&
        !resource.error &&
        saved.length > 0 &&
        !rows.length && (
          <p className="organizer-empty">
            {t("Select at least one saved scheme to print.")}
          </p>
        )}
    </div>
  );
}
