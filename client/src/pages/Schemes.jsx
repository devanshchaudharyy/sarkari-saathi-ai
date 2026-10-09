import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  Compass,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import Button from "../components/Button";
import SchemeCard from "../components/SchemeCard";
import useSchemes from "../hooks/useSchemes";
import {
  SCHEME_CATEGORIES,
  SCHEME_LEVELS,
  formatReviewDate,
} from "../../../shared/schemes";
import { STATES_AND_UTS } from "../../../shared/profile";
export default function Schemes() {
  const [params, setParams] = useSearchParams();
  const { search } = useLocation();
  const q = params.get("q") || "";
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const resource = useSchemes(`/schemes${search}`);
  const { data, loading, error } = resource;
  const catalog = data?.catalog;
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "page" && value === "1") next.delete("page");
    setParams(next);
  };
  const activeFilters = [
    [
      "category",
      SCHEME_CATEGORIES.find((item) => item.value === params.get("category"))
        ?.label,
    ],
    [
      "level",
      SCHEME_LEVELS.find((item) => item.value === params.get("level"))?.label,
    ],
    ["state", params.get("state")],
    ["q", q && `“${q}”`],
  ].filter(([key]) => params.has(key));
  const reset = () => {
    setDraft("");
    setParams({});
  };
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="catalog-page container page-enter"
    >
      <section className="catalog-intro">
        <div>
          <span className="eyebrow">
            <Compass size={15} aria-hidden="true" /> THE SCHEME LIBRARY
          </span>
          <h1>
            Find a clearer
            <br />
            <span>starting point.</span>
          </h1>
          <p>
            Explore government schemes, understand the basics,
            <br className="desktop-break" /> and take your next step at the
            official source.
          </p>
        </div>
        <aside className="catalog-coverage" aria-label="Catalog coverage">
          <span className="coverage-icon">
            <BookOpen size={22} aria-hidden="true" />
          </span>
          <div>
            <strong>
              {catalog
                ? `${catalog.total} schemes, carefully sourced.`
                : "A small, carefully sourced library."}
            </strong>
            <p>
              A curated starting collection, not a complete directory. Browse
              freely; no account or profile required.
            </p>
            <span>Official-source summaries · Editorial collection</span>
          </div>
        </aside>
      </section>
      <section
        className="catalog-controls"
        aria-label="Search and filter schemes"
      >
        <form
          className="scheme-search"
          role="search"
          aria-label="Search schemes"
          onSubmit={(event) => {
            event.preventDefault();
            change("q", draft.trim());
          }}
        >
          <Search size={21} aria-hidden="true" />
          <label className="sr-only" htmlFor="scheme-search">
            Search schemes
          </label>
          <input
            id="scheme-search"
            type="search"
            placeholder="Try ‘farmer’, ‘insurance’ or ‘PM-KISAN’"
            value={draft}
            maxLength={100}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit">
            Search <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </form>
        <div className="scheme-filters">
          <span className="filter-caption">
            <SlidersHorizontal size={16} aria-hidden="true" /> Refine your
            search
          </span>
          <label>
            Category
            <select
              aria-label="Category"
              value={params.get("category") || ""}
              onChange={(event) => change("category", event.target.value)}
            >
              <option value="">All categories</option>
              {SCHEME_CATEGORIES.map(({ value, label }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scheme level
            <select
              aria-label="Scheme level"
              value={params.get("level") || ""}
              onChange={(event) => change("level", event.target.value)}
            >
              <option value="">Central & state</option>
              {SCHEME_LEVELS.map(({ value, label }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            For location
            <select
              aria-label="For location"
              value={params.get("state") || ""}
              onChange={(event) => change("state", event.target.value)}
            >
              <option value="">All locations</option>
              {STATES_AND_UTS.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <div className="catalog-results-heading">
        <div>
          <h2>Explore the collection</h2>
          <p aria-live="polite" role="status">
            {loading
              ? "Loading schemes…"
              : error
                ? "Results unavailable"
                : `${data.pagination.total} ${data.pagination.total === 1 ? "scheme" : "schemes"} found`}
          </p>
        </div>
        <span className="catalog-sort">A–Z by scheme name</span>
      </div>
      {activeFilters.length > 0 && (
        <div className="active-filters">
          {activeFilters.map(([key, label]) => (
            <button
              key={key}
              onClick={() => change(key, "")}
              aria-label={`Remove ${key} filter: ${label || params.get(key)}`}
            >
              {label || params.get(key)} <X size={13} aria-hidden="true" />
            </button>
          ))}
          <button className="clear-filters" onClick={reset}>
            <RotateCcw size={13} aria-hidden="true" /> Clear all
          </button>
        </div>
      )}
      {loading ? (
        <div className="scheme-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="scheme-skeleton" key={index}>
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="catalog-empty" role="alert">
          <BookOpen size={32} aria-hidden="true" />
          <h2>We couldn’t load the collection</h2>
          <p>{error}</p>
          <div>
            <Button onClick={resource.retry}>Try again</Button>
            <Button variant="secondary" onClick={reset}>
              Reset search
            </Button>
          </div>
        </div>
      ) : data.schemes.length === 0 ? (
        <div className="catalog-empty">
          <Search size={32} aria-hidden="true" />
          <h2>
            {catalog.total === 0
              ? "The library is being prepared"
              : "No schemes in this view"}
          </h2>
          <p>
            {catalog.total === 0
              ? "The curated catalog has not been loaded yet. Please check back later."
              : "Try a broader search or reset the filters. This small collection does not cover every available government scheme."}
          </p>
          <Button variant="secondary" onClick={reset}>
            Reset search
          </Button>
        </div>
      ) : (
        <>
          <div className="scheme-grid">
            {data.schemes.map((scheme) => (
              <SchemeCard key={scheme.slug} scheme={scheme} search={search} />
            ))}
          </div>
          {data.pagination.totalPages > 1 && (
            <nav className="scheme-pagination" aria-label="Scheme result pages">
              <Button
                variant="secondary"
                disabled={data.pagination.page <= 1}
                onClick={() => change("page", String(data.pagination.page - 1))}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Previous
              </Button>
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => change("page", String(data.pagination.page + 1))}
              >
                Next <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
      <aside className="catalog-footnote">
        <BookOpen size={20} aria-hidden="true" />
        <div>
          <strong>A source behind every summary.</strong>
          <p>
            {catalog?.reviewedAt
              ? `Reviewed ${formatReviewDate(catalog.reviewedAt)}. `
              : ""}
            Central schemes are included for every Indian location; state-scheme
            coverage currently includes{" "}
            {catalog?.stateCoverage.length
              ? catalog.stateCoverage.join(", ")
              : "a limited selection"}
            . Location filters describe coverage, not personal eligibility.
            Requirements can change—confirm current terms on the official
            website.
          </p>
        </div>
      </aside>
    </main>
  );
}
