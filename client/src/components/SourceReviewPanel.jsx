import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api/axios";
import { useLanguage } from "../i18n/useLanguage";
import { toast } from "sonner";
import Button from "./Button";
import Field from "./Field";
import ConfirmDialog from "./ConfirmDialog";
import SourceStatus from "./SourceStatus";
import { addDays } from "../../../shared/reliability";
import { todayInIndia } from "../../../shared/applications";
export default function SourceReviewPanel({ entry, role, onChanged }) {
  const { t, locale } = useLanguage(),
    [review, setReview] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [confirm, setConfirm] = useState(false),
    [attested, setAttested] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(""),
    [label, setLabel] = useState(""),
    [observed, setObserved] = useState(todayInIndia),
    [note, setNote] = useState(""),
    [summary, setSummary] = useState(""),
    [resolution, setResolution] = useState("no_change"),
    [nextDay, setNextDay] = useState(() => addDays(todayInIndia(), 90));
  const active = useRef(null),
    locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setReview(null);
    api
      .get(`/catalog/${entry.slug}/review`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setReview(data.review);
        setSourceUrl(data.review.sources[0]?.url || "");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, [entry.slug, entry.revision, retry]);
  async function save(action) {
    if (locked.current || !review) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    active.current = controller;
    try {
      const { data } = await api.post(
        `/catalog/${entry.slug}/review/${action}`,
        {
          id: review.id,
          revision: review.revision,
          ...(action === "report"
            ? { sourceUrl, versionLabel: label, observedOn: observed, note }
            : {
                resolution,
                summary,
                versionLabel: label,
                nextReviewAt: nextDay,
                confirmed: true,
              }),
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setConfirm(false);
        toast.success(t(data.message));
        onChanged();
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section className="organizer-panel source-review-panel">
      <span className="eyebrow">{t("SOURCE REVIEW")}</span>
      <h2>{t("Keep scheme guidance current")}</h2>
      <p>
        {t(
          "Staff report changes from sources already linked to this scheme. Administrators review the evidence. No external website is fetched or monitored by this action.",
        )}
      </p>
      <p className="organizer-notice">
        {t(
          "Save any draft edits first. Changing review state reloads this catalog entry. Version labels and summaries are public; observation notes are staff-only.",
        )}
      </p>
      {error && !confirm && (
        <p className="organizer-error" role="alert">
          {t(error)}{" "}
          <Button variant="secondary" onClick={() => setRetry((v) => v + 1)}>
            {t("Reload review")}
          </Button>
        </p>
      )}
      {!review && !error ? (
        <p role="status">{t("Loading source review…")}</p>
      ) : (
        review && (
          <>
            <SourceStatus reliability={review.reliability} />
            {!review.pending ? (
              !review.published ? (
                <p>{t("Publish a scheme before reporting a source change.")}</p>
              ) : (
                <form
                  aria-label={t("Report source change")}
                  onSubmit={(e) => {
                    e.preventDefault();
                    save("report");
                  }}
                >
                  <fieldset disabled={busy}>
                    <legend className="sr-only">
                      {t("Source observation")}
                    </legend>
                    <label htmlFor="review-source">
                      {t("Linked official source")}
                      <select
                        id="review-source"
                        aria-label={t("Linked official source")}
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        required
                      >
                        {review.sources.map((s) => (
                          <option key={s.url} value={s.url}>
                            {s.title} · {new URL(s.url).hostname}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      id="source-version"
                      label="Public source version label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      minLength={3}
                      maxLength={160}
                      required
                      helper="Use the document version, publication date or an observed-page date. This label is supplied by staff, not independently verified."
                    />
                    <Field
                      id="source-observed"
                      label="Observed on"
                      type="date"
                      value={observed}
                      onChange={(e) => setObserved(e.target.value)}
                      min="2000-01-01"
                      max={todayInIndia()}
                      required
                    />
                    <label htmlFor="source-note">
                      {t("Private observation note")}
                      <textarea
                        id="source-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        minLength={10}
                        maxLength={1500}
                        rows={4}
                        required
                      />
                    </label>
                    <p className="readiness-warning">
                      {t(
                        "Queuing a report immediately pauses this scheme's screening, checklists and document guides until an administrator resolves the review.",
                      )}
                    </p>
                    <Button type="submit" loading={busy}>
                      {t("Queue source review")}
                    </Button>
                  </fieldset>
                </form>
              )
            ) : (
              <>
                <div className="source-evidence">
                  <h3>{t("Pending evidence")}</h3>
                  <a
                    href={review.pending.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {review.pending.source.title}
                  </a>
                  <p>
                    {t("Reported version")}: {review.pending.versionLabel}
                  </p>
                  <p>
                    {t("Observed on")}: {review.pending.observedOn}
                  </p>
                  <p className="preserve-lines">{review.pending.note}</p>
                </div>
                {role !== "admin" ? (
                  <p>
                    {t(
                      "An administrator must resolve this review. You may prepare and save a catalog draft below.",
                    )}
                  </p>
                ) : (
                  <form
                    aria-label={t("Resolve source review")}
                    onSubmit={(e) => {
                      e.preventDefault();
                      setAttested(false);
                      setConfirm(true);
                    }}
                  >
                    <fieldset disabled={busy}>
                      <legend className="sr-only">
                        {t("Review decision")}
                      </legend>
                      <label htmlFor="source-resolution">
                        {t("Review outcome")}
                        <select
                          id="source-resolution"
                          aria-label={t("Review outcome")}
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                        >
                          <option value="no_change">
                            {t("No catalog change needed")}
                          </option>
                          <option value="publish" disabled={!review.hasDraft}>
                            {t("Publish saved reviewed draft")}
                          </option>
                          <option value="archive">{t("Archive scheme")}</option>
                        </select>
                      </label>
                      <Field
                        id="resolved-version"
                        label="Public source version label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        minLength={3}
                        maxLength={160}
                        required
                      />
                      <Field
                        id="next-review"
                        label="Next editorial review"
                        type="date"
                        value={nextDay}
                        onChange={(e) => setNextDay(e.target.value)}
                        min={todayInIndia()}
                        max={addDays(todayInIndia(), 365)}
                        required
                      />
                      <label htmlFor="public-review-summary">
                        {t("Public change summary")}
                        <textarea
                          id="public-review-summary"
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          minLength={10}
                          maxLength={600}
                          rows={4}
                          required
                        />
                      </label>
                      <p>
                        {t(
                          "No-change resolution preserves the published catalog and any private draft. Publishing keeps old screening and preparation templates suspended until a separate code review.",
                        )}
                      </p>
                      <Button type="submit" disabled={busy}>
                        {t("Review and confirm outcome")}
                      </Button>
                    </fieldset>
                  </form>
                )}
              </>
            )}
            {!!review.history.length && (
              <details>
                <summary>
                  {t("Source review history")} ({review.history.length})
                </summary>
                {review.history.map((h, i) => (
                  <article className="source-history" key={i}>
                    <strong>{h.reviewedVersion}</strong>
                    <p>
                      {t(h.resolution)} ·{" "}
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(new Date(h.resolvedAt))}
                    </p>
                    <p>{h.summary}</p>
                  </article>
                ))}
              </details>
            )}
          </>
        )
      )}
      {confirm && (
        <ConfirmDialog
          title="Confirm this source-review outcome?"
          confirmLabel="Confirm review outcome"
          busy={busy}
          error={error}
          confirmDisabled={!attested}
          onCancel={() => setConfirm(false)}
          onConfirm={() => save("resolve")}
        >
          <p>
            {t(
              "The summary and catalog text will be visible to affected users. This action records your editorial decision; it does not certify government approval.",
            )}
          </p>
          <label>
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              disabled={busy}
            />
            {t(
              "I checked the official source, the current guidance and this public summary.",
            )}
          </label>
        </ConfirmDialog>
      )}
    </section>
  );
}
