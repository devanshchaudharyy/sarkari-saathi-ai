import { useEffect, useState } from "react";
import { ClipboardList, Plus, RotateCcw } from "lucide-react";
import api from "../api/axios";
import usePrivateCollection from "../hooks/usePrivateCollection";
import { useLanguage } from "../i18n/useLanguage";
import Button from "../components/Button";
import Field from "../components/Field";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  APPLICATION_STATUSES,
  applicationLabel,
  todayInIndia,
} from "../../../shared/applications.js";
export default function Applications() {
  const { t, locale } = useLanguage(),
    resource = usePrivateCollection("/applications");
  const [catalog, setCatalog] = useState([]),
    [slug, setSlug] = useState(""),
    [catalogError, setCatalogError] = useState(false),
    [removing, setRemoving] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/schemes?limit=24", { signal: controller.signal })
      .then(({ data }) => setCatalog(data.schemes))
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="organizer-page page-enter">
      <header>
        <span className="eyebrow">
          <ClipboardList size={16} />
          {t("YOUR PERSONAL APPLICATION JOURNEY")}
        </span>
        <h1>{t("Your applications, in view.")}</h1>
        <p>
          {t(
            "Record the steps you take, from preparation to the response you receive.",
          )}
        </p>
      </header>
      <p className="organizer-notice">
        {t(
          "Every status here is recorded by you. This is not an official application, government status check or approval verification. Apply and confirm decisions on the official provider’s website.",
        )}
      </p>
      <section className="organizer-panel">
        <h2>{t("Start tracking a scheme")}</h2>
        <form
          className="organizer-actions"
          onSubmit={async (event) => {
            event.preventDefault();
            if (slug) await resource.mutate("PUT", `/${slug}`, {});
          }}
        >
          <label htmlFor="track-scheme">
            {t("Scheme to track")}
            <select
              id="track-scheme"
              required
              value={slug}
              disabled={resource.busy}
              onChange={(event) => setSlug(event.target.value)}
            >
              <option value="">{t("Choose a scheme")}</option>
              {catalog.map((item) => (
                <option value={item.slug} key={item.slug}>
                  {item.acronym} · {t(item.name)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" loading={resource.busy} disabled={!slug}>
            <Plus size={16} />
            {t("Start tracking")}
          </Button>
        </form>
        {catalogError && (
          <p role="alert">
            {t(
              "The catalog could not be loaded. Reload the page to try again.",
            )}
          </p>
        )}
      </section>
      <div className="organizer-actions">
        <h2>{t("Tracked applications")}</h2>
        <Button
          variant="ghost"
          onClick={resource.reload}
          disabled={resource.busy}
        >
          <RotateCcw size={16} />
          {t("Reload records")}
        </Button>
      </div>
      {resource.loading ? (
        <p role="status">{t("Loading your records…")}</p>
      ) : (
        <>
          {resource.error && (
            <p className="organizer-error" role="alert">
              {t(resource.error)}
            </p>
          )}
          {!resource.entries.length && !resource.error && (
            <p className="organizer-empty">
              {t("No tracked applications yet. Choose a scheme to begin.")}
            </p>
          )}
          <div className="organizer-grid">
            {resource.entries.map((entry) => (
              <ApplicationCard
                key={entry.id}
                entry={entry}
                resource={resource}
                onRemove={() => setRemoving(entry)}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        </>
      )}
      {removing && (
        <ConfirmDialog
          title="Remove this application timeline?"
          busy={resource.busy}
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            if (
              await resource.mutate("DELETE", `/${removing.slug}`, {
                id: removing.id,
                revision: removing.revision,
              })
            )
              setRemoving(null);
          }}
        >
          <p>
            {t(
              "This deletes your personal timeline, not an official application or saved checklist.",
            )}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
function ApplicationCard({ entry, resource, onRemove, t, locale }) {
  const [status, setStatus] = useState(entry.status),
    [occurredOn, setDay] = useState(todayInIndia());
  useEffect(() => {
    setStatus(entry.status);
    setDay(todayInIndia());
  }, [entry.status, entry.revision]);
  return (
    <article className="organizer-panel application-card">
      <span className="badge">{t("Self-reported")}</span>
      <h3>{t(entry.name)}</h3>
      <strong>{t(applicationLabel(entry.status))}</strong>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await resource.mutate("PATCH", `/${entry.slug}`, {
            id: entry.id,
            revision: entry.revision,
            status,
            occurredOn,
          });
        }}
      >
        <fieldset disabled={resource.busy}>
          <legend>{t("Record an update")}</legend>
          <label htmlFor={`status-${entry.id}`}>
            {t("New status")}
            <select
              id={`status-${entry.id}`}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {APPLICATION_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(item.label)}
                </option>
              ))}
            </select>
          </label>
          <Field
            id={`date-${entry.id}`}
            label="Date this happened"
            type="date"
            min="1900-01-01"
            max={todayInIndia()}
            required
            value={occurredOn}
            onChange={(event) => setDay(event.target.value)}
          />
          <Button type="submit" loading={resource.busy}>
            {t("Save status update")}
          </Button>
        </fieldset>
      </form>
      <details>
        <summary>
          {t("Your recorded timeline")} ({entry.events.length})
        </summary>
        <ol className="application-timeline">
          {entry.events.map((event, index) => (
            <li key={index}>
              <strong>{t(applicationLabel(event.status))}</strong>
              <time dateTime={event.occurredOn}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(event.occurredOn))}
              </time>
            </li>
          ))}
        </ol>
      </details>
      <div className="organizer-actions">
        <Button variant="secondary" to={`/readiness?scheme=${entry.slug}`}>
          {t("Prepare checklist")}
        </Button>
        <Button variant="ghost" onClick={onRemove} disabled={resource.busy}>
          {t("Remove timeline")}
        </Button>
      </div>
    </article>
  );
}
