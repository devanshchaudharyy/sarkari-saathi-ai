import { useState } from "react";
import { BookOpenCheck, Plus, RotateCcw } from "lucide-react";
import usePrivateCollection from "../hooks/usePrivateCollection";
import useStaffRole from "../hooks/useStaffRole";
import { useLanguage } from "../i18n/useLanguage";
import Button from "../components/Button";
import Field from "../components/Field";
import SourceReviewPanel from "../components/SourceReviewPanel";
import ConfirmDialog from "../components/ConfirmDialog";
import { SCHEME_CATEGORIES } from "../../../shared/schemes.js";
import { STATES_AND_UTS } from "../../../shared/profile.js";
import { todayInIndia } from "../../../shared/applications.js";
const scalarFields = [
  ["name", "Scheme name"],
  ["acronym", "Short name / acronym"],
  ["authority", "Responsible authority"],
  ["summary", "Plain-language summary"],
  ["benefitLabel", "Benefit heading"],
  ["benefitNote", "Benefit explanation"],
];
const listFields = [
  ["benefits", "Benefits (one per line)"],
  ["eligibility", "Eligibility notes (one per line)"],
  ["applicationSteps", "Application steps (one per line)"],
  ["caveats", "Limitations (one per line)"],
  ["keywords", "Search keywords (one per line)"],
];
function blank() {
  return {
    slug: "",
    name: "",
    acronym: "",
    authority: "",
    category: "agriculture",
    level: "central",
    states: [],
    summary: "",
    benefitLabel: "",
    benefitNote: "",
    benefits: [],
    eligibility: [],
    applicationSteps: [],
    caveats: [],
    keywords: [],
    officialUrl: "",
    sources: [{ title: "", url: "" }],
    reviewedAt: "",
  };
}
export default function CatalogManager() {
  const { t } = useLanguage(),
    role = useStaffRole();
  if (role === null) return <p role="status">{t("Checking staff access…")}</p>;
  if (role === "citizen")
    return (
      <div className="organizer-page">
        <h1>{t("Catalog access is restricted")}</h1>
        <p>
          {t(
            "An operator must grant editor or administrator access. Signing up does not grant publishing permissions.",
          )}
        </p>
        <Button to="/schemes">{t("Browse schemes")}</Button>
      </div>
    );
  return <CatalogWorkspace key={role} role={role} />;
}
function CatalogWorkspace({ role }) {
  const { t, locale } = useLanguage(),
    resource = usePrivateCollection("/catalog"),
    [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [action, setAction] = useState(null),
    [attested, setAttested] = useState(false);
  const entry = resource.entries.find((row) => row.slug === selected);
  return (
    <div className="organizer-page page-enter">
      <header>
        <span className="eyebrow">
          <BookOpenCheck size={16} />
          {t("REVIEW FIRST. PUBLISH WITH CARE.")}
        </span>
        <h1>{t("Reviewed scheme catalog")}</h1>
        <p>
          {t(
            "Editors prepare drafts. Administrators publish or archive reviewed content. Public content stays unchanged while a draft is edited.",
          )}
        </p>
      </header>
      <p className="organizer-notice">
        {t(
          "Publishing content suspends its existing screening rules and preparation template until a separate code review. A source link alone does not verify a policy. New editorial text is not automatically translated.",
        )}
      </p>
      <div className="organizer-actions">
        <Button
          onClick={() => {
            setCreating(true);
            setSelected("");
          }}
          disabled={resource.busy}
        >
          <Plus size={16} />
          {t("New scheme draft")}
        </Button>
        <Button
          onClick={resource.reload}
          variant="ghost"
          disabled={resource.busy}
        >
          <RotateCcw size={16} />
          {t("Reload records")}
        </Button>
      </div>
      {resource.error && (
        <p role="alert" className="organizer-error">
          {t(resource.error)}
        </p>
      )}
      {resource.loading ? (
        <p role="status">{t("Loading your records…")}</p>
      ) : (
        <>
          <label htmlFor="catalog-entry">
            {t("Choose catalog entry")}
            <select
              id="catalog-entry"
              value={selected}
              disabled={resource.busy}
              onChange={(event) => {
                setSelected(event.target.value);
                setCreating(false);
              }}
            >
              <option value="">{t("Choose a scheme")}</option>
              {resource.entries.map((row) => (
                <option key={row.id} value={row.slug}>
                  {row.current.acronym} · {t(row.name)} ·{" "}
                  {t(row.published ? "Published" : "Not published")}
                  {row.draft ? " *" : ""}{" "}
                  {row.reliability?.state === "pending"
                    ? t("Review pending")
                    : row.reliability?.state === "due"
                      ? t("Review due")
                      : ""}
                </option>
              ))}
            </select>
          </label>
          {(creating || entry) && (
            <>
              {entry && (
                <SourceReviewPanel
                  key={`review-${entry.id}-${entry.revision}`}
                  entry={entry}
                  role={role}
                  onChanged={resource.reload}
                />
              )}
              <CatalogForm
                key={creating ? "new" : `draft-${entry.id}-${entry.revision}`}
                entry={entry}
                busy={resource.busy}
                onSave={async (data) => {
                  const okay = await resource.mutate(
                    creating ? "POST" : "PATCH",
                    creating ? "" : `/${entry.slug}`,
                    creating
                      ? data
                      : { id: entry.id, revision: entry.revision, data },
                  );
                  if (okay) {
                    setSelected(data.slug);
                    setCreating(false);
                  }
                }}
              />
              {entry && (
                <section className="organizer-panel">
                  <h2>{t("Publication controls")}</h2>
                  <p>
                    {t("Revision")} {entry.revision} ·{" "}
                    {t(entry.published ? "Published" : "Not published")}
                  </p>
                  <div className="organizer-actions">
                    {entry.draft && (
                      <Button
                        disabled={resource.busy}
                        variant="secondary"
                        onClick={() => {
                          setAction("discard");
                          setAttested(false);
                        }}
                      >
                        {t("Discard saved draft")}
                      </Button>
                    )}
                    {role === "admin" && (
                      <>
                        <Button
                          disabled={
                            resource.busy || !entry.draft || entry.reviewPending
                          }
                          onClick={() => {
                            setAction("publish");
                            setAttested(false);
                          }}
                        >
                          {t("Publish saved draft")}
                        </Button>
                        {entry.published && (
                          <Button
                            variant="danger"
                            disabled={resource.busy || entry.reviewPending}
                            onClick={() => {
                              setAction("archive");
                              setAttested(false);
                            }}
                          >
                            {t("Archive scheme")}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  {role !== "admin" && (
                    <p>{t("Only an administrator can publish or archive.")}</p>
                  )}
                  <details>
                    <summary>
                      {t("Change history")} ({entry.history.length})
                    </summary>
                    <ol className="application-timeline">
                      {entry.history.map((event, index) => (
                        <li key={index}>
                          <span>
                            {t(
                              {
                                draft_created: "Draft created",
                                draft_saved: "Draft saved",
                                publish: "Published",
                                archive: "Archived",
                                discard: "Draft discarded",
                                review_requested: "Review pending",
                                review_no_change: "Review completed",
                                review_publish: "Published",
                                review_archive: "Archived",
                              }[event.action] || event.action,
                            )}{" "}
                            · {t("Revision")} {event.revision}
                          </span>
                          <time>
                            {new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: "Asia/Kolkata",
                            }).format(new Date(event.at))}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </details>
                </section>
              )}
            </>
          )}
          {!creating && !entry && (
            <p className="organizer-empty">
              {t("Choose an entry or create a draft to begin reviewing.")}
            </p>
          )}
        </>
      )}
      {action && entry && (
        <ConfirmDialog
          title={
            action === "publish"
              ? "Publish this reviewed draft?"
              : action === "archive"
                ? "Archive this scheme?"
                : "Discard this saved draft?"
          }
          confirmLabel={
            action === "publish"
              ? "Confirm publication"
              : action === "archive"
                ? "Archive scheme"
                : "Discard draft"
          }
          busy={resource.busy}
          error={resource.error}
          confirmDisabled={action === "publish" && !attested}
          onCancel={() => setAction(null)}
          onConfirm={async () => {
            if (action === "publish" && !attested) return;
            if (
              await resource.mutate("POST", `/${entry.slug}/${action}`, {
                id: entry.id,
                revision: entry.revision,
                confirmed: true,
              })
            )
              setAction(null);
          }}
        >
          <p>
            {t(
              action === "publish"
                ? "Confirm that you reviewed the sources, wording and review date. Publishing hides old screening and checklist guidance until it is reviewed separately."
                : action === "archive"
                  ? "This removes the scheme from public discovery. Existing personal records remain available to their owners."
                  : "Public content will not change. Unsaved edits in this form are not part of the saved draft.",
            )}
          </p>
          {action === "publish" && (
            <label>
              <input
                type="checkbox"
                checked={attested}
                onChange={(event) => setAttested(event.target.checked)}
              />
              {t("I reviewed the official sources and saved draft.")}
            </label>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
function CatalogForm({ entry, busy, onSave }) {
  const { t } = useLanguage(),
    [data, setData] = useState(entry?.draft || entry?.current || blank());
  const change = (key, value) =>
    setData((current) => ({ ...current, [key]: value }));
  return (
    <form
      className="organizer-panel catalog-form"
      aria-label={t("Scheme editorial draft")}
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          ...data,
          ...Object.fromEntries(
            listFields.map(([key]) => [
              key,
              data[key].map((value) => value.trim()).filter(Boolean),
            ]),
          ),
        });
      }}
    >
      <h2>{t(entry ? "Edit draft" : "New draft")}</h2>
      <fieldset disabled={busy}>
        <legend className="sr-only">{t("Scheme content")}</legend>
        <Field
          id="draft-slug"
          label="Permanent scheme slug"
          value={data.slug}
          disabled={!!entry}
          required
          maxLength={100}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          onChange={(event) => change("slug", event.target.value)}
        />
        {scalarFields.map(([key, label]) => (
          <Field
            key={key}
            id={`draft-${key}`}
            label={label}
            value={data[key]}
            required
            maxLength={
              key === "summary" || key === "benefitNote"
                ? 1500
                : key === "acronym"
                  ? 32
                  : 180
            }
            onChange={(event) => change(key, event.target.value)}
          />
        ))}
        <div className="organizer-actions">
          <label htmlFor="draft-category">
            {t("Category")}
            <select
              id="draft-category"
              value={data.category}
              onChange={(event) => change("category", event.target.value)}
            >
              {SCHEME_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(item.label)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="draft-level">
            {t("Scheme level")}
            <select
              id="draft-level"
              value={data.level}
              onChange={(event) =>
                setData((current) => ({
                  ...current,
                  level: event.target.value,
                  states:
                    event.target.value === "central" ? [] : current.states,
                }))
              }
            >
              <option value="central">{t("Central scheme")}</option>
              <option value="state">{t("State scheme")}</option>
            </select>
          </label>
        </div>
        {data.level === "state" && (
          <label htmlFor="draft-states">
            {t("State coverage")}
            <select
              id="draft-states"
              multiple
              required
              size={5}
              value={data.states}
              onChange={(event) =>
                change(
                  "states",
                  [...event.target.selectedOptions].map(
                    (option) => option.value,
                  ),
                )
              }
            >
              {STATES_AND_UTS.map((state) => (
                <option key={state} value={state}>
                  {t(state)}
                </option>
              ))}
            </select>
          </label>
        )}
        {listFields.map(([key, label]) => (
          <label htmlFor={`draft-${key}`} key={key}>
            {t(label)}
            <textarea
              id={`draft-${key}`}
              rows={4}
              value={data[key].join("\n")}
              required={key !== "keywords"}
              onChange={(event) => change(key, event.target.value.split("\n"))}
            />
          </label>
        ))}
        <Field
          id="draft-officialUrl"
          label="Official application / information URL"
          type="url"
          required
          value={data.officialUrl}
          onChange={(event) => change("officialUrl", event.target.value)}
        />
        <h3>{t("Official references")}</h3>
        {data.sources.map((source, index) => (
          <div className="catalog-source" key={index}>
            <Field
              id={`source-title-${index}`}
              label={t("Source title {0}", [index + 1])}
              required
              maxLength={180}
              value={source.title}
              onChange={(event) =>
                change(
                  "sources",
                  data.sources.map((item, i) =>
                    i === index ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
            <Field
              id={`source-url-${index}`}
              label={t("Source URL {0}", [index + 1])}
              type="url"
              required
              value={source.url}
              onChange={(event) =>
                change(
                  "sources",
                  data.sources.map((item, i) =>
                    i === index ? { ...item, url: event.target.value } : item,
                  ),
                )
              }
            />
            {data.sources.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  change(
                    "sources",
                    data.sources.filter((_, i) => i !== index),
                  )
                }
              >
                {t("Remove reference")}
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          disabled={data.sources.length >= 10}
          onClick={() =>
            change("sources", [...data.sources, { title: "", url: "" }])
          }
        >
          {t("Add official reference")}
        </Button>
        <Field
          id="draft-reviewedAt"
          label="Date sources were reviewed"
          type="date"
          min="2000-01-01"
          max={todayInIndia()}
          required
          value={data.reviewedAt}
          onChange={(event) => change("reviewedAt", event.target.value)}
        />
        <p>
          {t(
            "Use HTTPS government sources (.gov.in or .nic.in). Do not mark a new review date without checking the actual policy. Saving a draft does not publish it.",
          )}
        </p>
        <Button type="submit" loading={busy}>
          {t("Save editorial draft")}
        </Button>
      </fieldset>
    </form>
  );
}
