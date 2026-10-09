import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bookmark,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Info,
} from "lucide-react";
import useReadiness from "../hooks/useReadiness";
import Button from "../components/Button";
import ReadinessCard from "../components/ReadinessCard";
import RemoveSavedDialog from "../components/RemoveSavedDialog";
export default function Readiness() {
  const resource = useReadiness(),
    [params, setParams] = useSearchParams(),
    [removing, setRemoving] = useState(null);
  const listHeading = useRef(null);
  const saved = resource.entries.filter((row) => row.saved),
    requested = params.get("scheme");
  const selected = resource.entries.find((row) => row.slug === requested);
  const rows = selected ? [selected] : saved;
  const done = saved.reduce((sum, row) => sum + row.progress.completed, 0),
    total = saved.reduce((sum, row) => sum + row.progress.total, 0);
  function select(value) {
    setRemoving(null);
    setParams(value ? { scheme: value } : {});
  }
  function focusList() {
    requestAnimationFrame(() =>
      listHeading.current?.focus({ preventScroll: true }),
    );
  }
  return (
    <div className="readiness-page page-enter">
      <header className="readiness-heading">
        <span className="eyebrow">
          <FileCheck2 size={15} /> YOUR NEXT STEP, A LITTLE CLEARER
        </span>
        <h1>
          Keep your possibilities.
          <br />
          <span>Prepare at your pace.</span>
        </h1>
        <p>
          Save schemes you want to explore. Keep track of the information,
          <br className="desktop-break" /> documents and next steps you’ve
          prepared.
        </p>
      </header>
      <div className="readiness-privacy">
        <ShieldCheck size={21} />
        <div>
          <strong>Your checklist. Your account.</strong>
          <p>
            Only task marks are saved. Keep document scans, Aadhaar numbers,
            bank details and application information with you and the official
            provider.
          </p>
        </div>
      </div>
      {resource.loading ? (
        <div className="screening-loading" role="status">
          <Bookmark size={24} />
          <span>Retrieving your saved schemes</span>
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ) : resource.error ? (
        <div className="profile-load-error" role="alert">
          <h2>We couldn’t load your preparation space</h2>
          <p>{resource.error}</p>
          <Button onClick={resource.retry}>Try again</Button>
        </div>
      ) : (
        <>
          <div
            className="readiness-stats"
            aria-label="Saved preparation overview"
          >
            <div>
              <Bookmark size={19} />
              <strong>{saved.length}</strong>
              <span>Saved schemes</span>
            </div>
            <div>
              <FileCheck2 size={19} />
              <strong>
                {done}
                <small> / {total}</small>
              </strong>
              <span>Listed tasks complete</span>
            </div>
            <div>
              <ShieldCheck size={19} />
              <strong>Private</strong>
              <span>Saved to your account</span>
            </div>
          </div>
          <section
            className="readiness-toolbar"
            aria-label="Preparation controls"
          >
            <div>
              <label htmlFor="readiness-select">Explore a checklist</label>
              <select
                id="readiness-select"
                value={selected?.slug || ""}
                disabled={!!resource.busy}
                onChange={(event) => select(event.target.value)}
              >
                <option value="">All my saved schemes</option>
                {resource.entries.map((row) => (
                  <option value={row.slug} key={row.slug}>
                    {row.acronym} · {row.name}
                  </option>
                ))}
              </select>
            </div>
            <Button to="/schemes" variant="secondary">
              Browse schemes <ArrowRight size={15} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!!resource.busy}
              onClick={resource.retry}
            >
              <RotateCcw size={15} />
              Reload saved schemes
            </Button>
          </section>
          {requested && !selected && (
            <p className="readiness-warning" role="status">
              That scheme isn’t available in this catalog. Showing your saved
              list.
            </p>
          )}
          {resource.mutationError && (
            <div className="readiness-error" role="alert">
              <p>{resource.mutationError}</p>
              <Button
                variant="secondary"
                disabled={!!resource.busy}
                onClick={resource.retry}
              >
                Reload saved schemes
              </Button>
            </div>
          )}
          <div className="readiness-list-heading">
            <h2 ref={listHeading} tabIndex={-1}>
              {selected
                ? selected.saved
                  ? "Your preparation checklist"
                  : "Preview before you save"
                : "Your saved schemes"}
            </h2>
            <span>
              {rows.length} {rows.length === 1 ? "scheme" : "schemes"} ·
              Alphabetical order
            </span>
          </div>
          {rows.length ? (
            <div className="readiness-grid">
              {rows.map((entry) => (
                <ReadinessCard
                  key={entry.slug}
                  entry={entry}
                  busy={resource.busy}
                  onSave={async (entry) => {
                    if (await resource.save(entry)) focusList();
                  }}
                  onToggle={resource.toggle}
                  onRemove={(row) => setRemoving(row.slug)}
                />
              ))}
            </div>
          ) : (
            <div className="readiness-empty">
              <span className="icon-box indigo">
                <Bookmark size={26} />
              </span>
              <h2>A little preparation starts with a saved scheme.</h2>
              <p>
                Choose a checklist above or browse the library. Your saved list
                and task progress will be here when you return.
              </p>
              <Button to="/schemes">
                Find a scheme to save <ArrowRight size={16} />
              </Button>
            </div>
          )}
          <div className="readiness-disclaimer">
            <Info size={20} />
            <p>
              These are partial preparation guides. Completing the listed tasks
              does not verify your documents, establish eligibility, submit an
              application or confirm approval. Requirements can vary; follow the
              official provider’s current instructions.
            </p>
          </div>
        </>
      )}
      {removing &&
        resource.entries.some((row) => row.slug === removing && row.saved) && (
          <RemoveSavedDialog
            entry={resource.entries.find((row) => row.slug === removing)}
            busy={!!resource.busy}
            onCancel={() => setRemoving(null)}
            onConfirm={async () => {
              const entry = resource.entries.find(
                (row) => row.slug === removing,
              );
              await resource.remove(entry);
              setRemoving(null);
              focusList();
            }}
          />
        )}
    </div>
  );
}
