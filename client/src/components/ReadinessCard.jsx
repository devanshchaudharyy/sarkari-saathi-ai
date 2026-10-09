import {
  BookmarkPlus,
  ArrowUpRight,
  Trash2,
  Check,
  Info,
  LoaderCircle,
} from "lucide-react";
import Button from "./Button";
import { categoryLabel } from "../../../shared/schemes";
export default function ReadinessCard({
  entry,
  busy,
  onSave,
  onToggle,
  onRemove,
}) {
  return (
    <article
      className={`readiness-card ${entry.progress.complete ? "readiness-complete" : ""}`}
      aria-label={entry.name}
    >
      <div className="readiness-card-heading">
        <div>
          <span className="eyebrow">
            {entry.acronym} ·{" "}
            {entry.category
              ? categoryLabel(entry.category)
              : "Removed from catalog"}
          </span>
          <h2>{entry.name}</h2>
        </div>
        <span className={`badge ${entry.progress.complete ? "green" : ""}`}>
          {entry.saved
            ? entry.progress.complete
              ? "Listed tasks complete"
              : "Saved scheme"
            : "Checklist preview"}
        </span>
      </div>
      {!entry.available ? (
        <div className="readiness-warning" role="note">
          <Info size={18} />
          <p>
            This scheme is no longer in the current catalog. Its checklist is
            unavailable; you can remove the saved entry.
          </p>
        </div>
      ) : entry.items.length === 0 ? (
        <p className="readiness-warning">
          No reviewed preparation checklist is available for this scheme yet.
        </p>
      ) : (
        <>
          <div className="readiness-progress">
            <div>
              <strong>
                {entry.saved
                  ? `${entry.progress.completed} of ${entry.progress.total} tasks complete`
                  : `${entry.items.length} preparation tasks`}
              </strong>
              <span>
                {entry.saved
                  ? `${entry.progress.percentage}%`
                  : "Save to track progress"}
              </span>
            </div>
            <progress
              aria-label={`${entry.acronym} preparation progress`}
              value={entry.saved ? entry.progress.percentage : 0}
              max={100}
            />
            <p>
              {entry.progress.complete
                ? "Your listed tasks are complete. Confirm the provider’s current requirements before applying."
                : "Progress reflects your own checklist marks, not verified documents or eligibility."}
            </p>
          </div>
          {entry.versionChanged && (
            <p className="readiness-warning" role="note">
              This checklist has been revised. Previous marks are not counted;
              review the current tasks before checking them again.
            </p>
          )}
          <fieldset
            className="readiness-items"
            disabled={!entry.saved || !!busy}
          >
            <legend className="sr-only">
              {entry.acronym} preparation checklist
            </legend>
            {entry.items.map((item) => (
              <div
                className={`readiness-item ${item.completed ? "task-complete" : ""}`}
                key={item.id}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={entry.saved && item.completed}
                    onChange={() => onToggle(entry, item)}
                  />
                  <span>
                    <small>{item.kind}</small>
                    <strong>{item.title}</strong>
                  </span>
                </label>
                <p>{item.detail}</p>
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official reference{" "}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              </div>
            ))}
          </fieldset>
          <small className="readiness-review">
            Checklist reviewed {entry.reviewedAt} · {entry.templateVersion}
          </small>
        </>
      )}
      <div className="readiness-card-actions">
        {!entry.saved && entry.available ? (
          <Button
            type="button"
            disabled={!!busy}
            loading={busy === entry.slug}
            onClick={() => onSave(entry)}
          >
            <BookmarkPlus size={16} />
            Save scheme to start
          </Button>
        ) : entry.saved ? (
          <Button
            type="button"
            variant="ghost"
            disabled={!!busy}
            onClick={() => onRemove(entry)}
          >
            <Trash2 size={15} />
            Remove from list
          </Button>
        ) : null}
        {entry.available && (
          <>
            <Button to={`/schemes/${entry.slug}`} variant="ghost">
              Scheme details <ArrowUpRight size={14} />
            </Button>
            <a
              className="readiness-official"
              href={entry.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official next steps <ArrowUpRight size={14} />
              <span className="sr-only">opens in a new tab</span>
            </a>
          </>
        )}
        {busy === entry.slug && entry.saved && (
          <span role="status" className="readiness-saving">
            <LoaderCircle size={15} className="spin" />
            Saving your change
          </span>
        )}
      </div>
    </article>
  );
}
