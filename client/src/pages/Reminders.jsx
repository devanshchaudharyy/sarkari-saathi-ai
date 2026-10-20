import { useEffect, useState } from "react";
import { Bell, RotateCcw } from "lucide-react";
import api from "../api/axios";
import usePrivateCollection from "../hooks/usePrivateCollection";
import { useLanguage } from "../i18n/useLanguage";
import Button from "../components/Button";
import Field from "../components/Field";
import ConfirmDialog from "../components/ConfirmDialog";
import { REMINDER_KINDS, REMINDER_STATES } from "../../../shared/reminders.js";
import { todayInIndia } from "../../../shared/applications.js";
export default function Reminders() {
  const { t, locale } = useLanguage(),
    resource = usePrivateCollection("/reminders"),
    [catalog, setCatalog] = useState([]),
    [catalogError, setCatalogError] = useState(false),
    [slug, setSlug] = useState(""),
    [kind, setKind] = useState("prepare"),
    [dueOn, setDay] = useState(todayInIndia()),
    [filter, setFilter] = useState("all"),
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
          <Bell size={16} />
          {t("A SMALL NUDGE, AT YOUR PACE")}
        </span>
        <h1>{t("Remember your next step.")}</h1>
        <p>
          {t(
            "Choose a personal date for preparation or following up on an application.",
          )}
        </p>
      </header>
      <p className="organizer-notice">
        {t(
          "These are your chosen dates, not verified scheme deadlines. Reminders appear here and in the workspace when you open the app. No email, SMS or background push is sent. Dates follow India Standard Time.",
        )}
      </p>
      <section className="organizer-panel">
        <h2>{t("Create a personal reminder")}</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (slug)
              await resource.mutate("PUT", `/${slug}/${kind}`, { dueOn });
          }}
        >
          <fieldset disabled={resource.busy}>
            <legend className="sr-only">{t("Reminder details")}</legend>
            <div className="organizer-actions">
              <label htmlFor="reminder-scheme">
                {t("Reminder scheme")}
                <select
                  id="reminder-scheme"
                  value={slug}
                  required
                  onChange={(event) => setSlug(event.target.value)}
                >
                  <option value="">{t("Choose a scheme")}</option>
                  {catalog.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.acronym} · {t(item.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="reminder-kind">
                {t("Reminder purpose")}
                <select
                  id="reminder-kind"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                >
                  {REMINDER_KINDS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {t(item.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Field
              id="reminder-day"
              type="date"
              label="Your reminder date"
              min={todayInIndia()}
              max="2100-12-31"
              value={dueOn}
              required
              onChange={(event) => setDay(event.target.value)}
            />
            <Button type="submit" loading={resource.busy} disabled={!slug}>
              {t("Create reminder")}
            </Button>
          </fieldset>
        </form>
        <p>
          {t(
            "One reminder per purpose and scheme. Creating it again keeps its existing date; edit the saved reminder below to reschedule.",
          )}
        </p>
        {catalogError && (
          <p role="alert">
            {t(
              "The catalog could not be loaded. Reload the page to try again.",
            )}
          </p>
        )}
      </section>
      <div className="organizer-actions">
        <h2>{t("Your reminders")}</h2>
        <Button
          variant="ghost"
          disabled={resource.busy}
          onClick={resource.reload}
        >
          <RotateCcw size={16} />
          {t("Reload records")}
        </Button>
      </div>
      <label htmlFor="reminder-filter">
        {t("Show reminders")}
        <select
          id="reminder-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">{t("All reminders")}</option>
          {REMINDER_STATES.map((item) => (
            <option key={item.value} value={item.value}>
              {t(item.label)} (
              {
                resource.entries.filter((row) => row.status === item.value)
                  .length
              }
              )
            </option>
          ))}
        </select>
      </label>
      {resource.loading ? (
        <p role="status">{t("Loading your records…")}</p>
      ) : (
        <>
          {resource.error && (
            <p role="alert" className="organizer-error">
              {t(resource.error)}
            </p>
          )}
          {!resource.entries.filter(
            (row) => filter === "all" || row.status === filter,
          ).length &&
            !resource.error && (
              <p className="organizer-empty">
                {t("No reminders in this view.")}
              </p>
            )}
          <div className="organizer-grid">
            {resource.entries
              .filter((row) => filter === "all" || row.status === filter)
              .sort(
                (a, b) =>
                  a.dueOn.localeCompare(b.dueOn) || a.id.localeCompare(b.id),
              )
              .map((row) => (
                <ReminderCard
                  key={row.id}
                  row={row}
                  resource={resource}
                  onRemove={() => setRemoving(row)}
                  t={t}
                  locale={locale}
                />
              ))}
          </div>
        </>
      )}
      {removing && (
        <ConfirmDialog
          title="Remove this reminder?"
          busy={resource.busy}
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            if (
              await resource.mutate("DELETE", `/${removing.id}`, {
                revision: removing.revision,
              })
            )
              setRemoving(null);
          }}
        >
          <p>
            {t(
              "Only this personal reminder will be removed. Your timeline and checklist stay saved.",
            )}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
function ReminderCard({ row, resource, onRemove, t, locale }) {
  const [day, setDay] = useState(row.dueOn);
  useEffect(() => setDay(row.dueOn), [row.dueOn, row.revision]);
  const update = (completed, dueOn = row.dueOn) =>
    resource.mutate("PATCH", `/${row.id}`, {
      revision: row.revision,
      dueOn,
      completed,
    });
  return (
    <article className="organizer-panel reminder-card">
      <span className={`badge reminder-${row.status}`}>
        {t(REMINDER_STATES.find((item) => item.value === row.status)?.label)}
      </span>
      <h3>{t(row.name)}</h3>
      <strong>
        {t(REMINDER_KINDS.find((item) => item.value === row.kind)?.label)}
      </strong>
      <p>
        <time dateTime={row.dueOn}>
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(row.dueOn))}
        </time>{" "}
        · {t("Your chosen date")}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await update(false, day);
        }}
      >
        <Field
          id={`reminder-date-${row.id}`}
          label="Reschedule for"
          type="date"
          min={todayInIndia()}
          max="2100-12-31"
          required
          value={day}
          disabled={resource.busy}
          onChange={(event) => setDay(event.target.value)}
        />
        <Button type="submit" loading={resource.busy} variant="secondary">
          {t("Reschedule and reopen")}
        </Button>
      </form>
      <div className="organizer-actions">
        <Button
          disabled={resource.busy}
          onClick={() => update(!row.completedAt)}
        >
          {t(row.completedAt ? "Mark as pending" : "Mark complete")}
        </Button>
        <Button variant="ghost" disabled={resource.busy} onClick={onRemove}>
          {t("Remove reminder")}
        </Button>
      </div>
    </article>
  );
}
