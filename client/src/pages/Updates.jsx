import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
import api, { errorMessage } from "../api/axios";
import Button from "../components/Button";
import Loader from "../components/Loader";
import SourceStatus from "../components/SourceStatus";
const fieldLabels = {
  slug: "Scheme address",
  name: "Scheme name",
  acronym: "Short name / acronym",
  category: "Category",
  level: "Government level",
  states: "States",
  authority: "Responsible authority",
  summary: "Plain-language summary",
  benefitLabel: "Benefit heading",
  benefitNote: "Benefit explanation",
  benefits: "Benefits",
  eligibility: "Eligibility notes",
  applicationSteps: "Application steps",
  caveats: "Limitations",
  officialUrl: "Official website",
  sources: "Official references",
  reviewedAt: "Review date",
};
const kinds = {
  review_requested: "Review pending",
  review_completed: "Review completed",
  content_updated: "Catalog content updated",
  archived: "Scheme archived",
};
export default function Updates() {
  const { user } = useAuth();
  return <UpdatesForUser key={user.id} />;
}
function UpdatesForUser() {
  const { t, locale } = useLanguage(),
    [state, setState] = useState({ entries: [], loading: true, error: "" }),
    [attempt, setAttempt] = useState(0),
    [busy, setBusy] = useState(""),
    [mutationError, setMutationError] = useState("");
  const active = useRef(null),
    locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setState({ entries: [], loading: true, error: "" });
    api
      .get("/updates", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setState({ entries: data.entries, loading: false, error: "" });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({ entries: [], loading: false, error: errorMessage(e) });
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, [attempt]);
  async function acknowledge(entry) {
    if (locked.current) return;
    locked.current = true;
    setBusy(entry.slug);
    setMutationError("");
    const controller = new AbortController();
    active.current = controller;
    try {
      await api.patch(
        `/updates/${entry.slug}/read`,
        {
          saveId: entry.saveId,
          seenRevision: entry.seenRevision,
          revision: entry.reliability.revision,
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted)
        setState((s) => ({
          ...s,
          entries: s.entries.map((e) =>
            e.slug === entry.slug
              ? {
                  ...e,
                  seenRevision: entry.reliability.revision,
                  unread: false,
                }
              : e,
          ),
        }));
    } catch (e) {
      if (!controller.signal.aborted) setMutationError(errorMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        locked.current = false;
        setBusy("");
      }
    }
  }
  return (
    <div className="organizer-page updates-page page-enter">
      <header>
        <span className="eyebrow">{t("YOUR SAVED SCHEMES")}</span>
        <h1>{t("Scheme updates")}</h1>
        <p>
          {t(
            "Read source-review notices and published catalog changes for schemes you saved. These are in-app editorial updates, not government application-status messages.",
          )}
        </p>
      </header>
      <p className="organizer-notice">
        {t(
          "Notices refresh when this page loads or you reload it. Marking an update read does not confirm eligibility, complete a checklist or acknowledge an official notice.",
        )}
      </p>
      <div className="organizer-actions">
        <Button
          variant="secondary"
          onClick={() => {
            setMutationError("");
            setAttempt((v) => v + 1);
          }}
          disabled={!!busy}
        >
          {t("Reload updates")}
        </Button>
        <Button to="/readiness" variant="ghost">
          {t("Return to preparation")}
        </Button>
      </div>
      {state.loading ? (
        <Loader />
      ) : state.error ? (
        <p className="organizer-error" role="alert">
          {t(state.error)}
        </p>
      ) : !state.entries.length ? (
        <p className="organizer-empty">
          {t("No updates are recorded for your saved schemes.")}
        </p>
      ) : (
        <>
          <p role="status">
            {t("{0} saved schemes with unread updates", [
              state.entries.filter((e) => e.unread).length,
            ])}
          </p>
          {state.entries.map((entry) => (
            <article
              className="organizer-panel scheme-update-card"
              key={entry.slug}
              aria-label={entry.name}
            >
              <div className="organizer-actions">
                <h2>{t(entry.name)}</h2>
                <span className="badge">
                  {t(entry.unread ? "Unread updates" : "Updates read")}
                </span>
              </div>
              <SourceStatus reliability={entry.reliability} />
              {entry.historyTruncated && (
                <p className="readiness-warning">
                  {t(
                    "Earlier updates are outside the retained history. Review the current official instructions before proceeding.",
                  )}
                </p>
              )}
              <ol className="scheme-update-history">
                {[...entry.updates].reverse().map((update) => (
                  <li key={update.revision}>
                    <span className="eyebrow">
                      {t(kinds[update.kind] || update.kind)} · {t("Revision")}{" "}
                      {update.revision}
                    </span>
                    <time>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      }).format(new Date(update.at))}
                    </time>
                    <p>{t(update.summary)}</p>
                    {update.sourceVersion && (
                      <p>
                        {t("Staff-supplied source label")}:{" "}
                        {update.sourceVersion}
                      </p>
                    )}
                    {update.source && (
                      <a
                        href={update.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(update.source.title)}
                      </a>
                    )}
                    {!!update.changes.length && (
                      <details>
                        <summary>{t("Published catalog differences")}</summary>
                        <p>
                          {t(
                            "These are shortened before/after catalog previews, not a comparison of complete government documents.",
                          )}
                        </p>
                        {update.changes.map((change) => (
                          <div className="catalog-diff" key={change.field}>
                            <h3>
                              {t(fieldLabels[change.field] || "Catalog field")}
                            </h3>
                            <div>
                              <section>
                                <strong>{t("Previous catalog text")}</strong>
                                <p className="preserve-lines">
                                  {change.before}
                                </p>
                              </section>
                              <section>
                                <strong>{t("Published catalog text")}</strong>
                                <p className="preserve-lines">{change.after}</p>
                              </section>
                            </div>
                          </div>
                        ))}
                      </details>
                    )}
                  </li>
                ))}
              </ol>
              <div className="organizer-actions">
                {entry.unread && (
                  <Button
                    onClick={() => acknowledge(entry)}
                    loading={busy === entry.slug}
                    disabled={!!busy}
                  >
                    {t("Mark these updates read")}
                  </Button>
                )}
                {entry.available && (
                  <Button to={`/schemes/${entry.slug}`} variant="secondary">
                    {t("Scheme details")}
                  </Button>
                )}
                <Button
                  href={entry.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                >
                  {t("Official instructions")}
                </Button>
              </div>
            </article>
          ))}
        </>
      )}
      {mutationError && (
        <p role="alert" className="organizer-error">
          {t(mutationError)} {t("Reload updates before trying again.")}
        </p>
      )}
    </div>
  );
}
