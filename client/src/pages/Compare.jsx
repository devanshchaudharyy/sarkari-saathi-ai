import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Columns3, RotateCcw } from "lucide-react";
import api, { errorMessage } from "../api/axios";
import useCatalogOptions from "../hooks/useCatalogOptions";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
import Button from "../components/Button";
import {
  comparisonSelection,
  comparisonQuery,
} from "../../../shared/comparison.js";
import { SCREENING_STATUSES } from "../../../shared/eligibility.js";
import { categoryLabel, formatReviewDate } from "../../../shared/schemes.js";
export default function Compare() {
  const { t, locale } = useLanguage(),
    { user } = useAuth(),
    catalog = useCatalogOptions(),
    [params, setParams] = useSearchParams(),
    [attempt, setAttempt] = useState(0);
  const selection = comparisonSelection(
      params,
      catalog.loading ? undefined : catalog.entries.map((item) => item.slug),
    ),
    key = selection.slugs.join(",");
  const [state, setState] = useState({
    key: "",
    rows: [],
    loading: false,
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    if (!key) {
      setState({ key, rows: [], loading: false, error: "" });
      return () => controller.abort();
    }
    setState({ key, rows: [], loading: true, error: "" });
    Promise.all(
      key
        .split(",")
        .map((slug) =>
          api.get(`/schemes/${slug}`, { signal: controller.signal }),
        ),
    )
      .then((responses) => {
        if (!controller.signal.aborted)
          setState({
            key,
            rows: responses.map((response) => response.data.scheme),
            loading: false,
            error: "",
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            rows: [],
            loading: false,
            error: errorMessage(error),
          });
      });
    return () => controller.abort();
  }, [key, attempt]);
  function select(index, value) {
    const next = [...selection.slugs];
    if (value) next[index] = value;
    else next.splice(index, 1);
    setParams(comparisonQuery(next.filter(Boolean)));
  }
  const loading = catalog.loading || state.key !== key || state.loading;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container organizer-page compare-page page-enter"
    >
      <header>
        <span className="eyebrow">
          <Columns3 size={16} />
          {t("A CLEARER WAY TO COMPARE")}
        </span>
        <h1>{t("Compare your possibilities.")}</h1>
        <p>
          {t(
            "Choose two or three schemes and review their differences before visiting the official source.",
          )}
        </p>
      </header>
      <p className="organizer-notice">
        {t(
          "The order is yours, not a recommendation ranking. Benefits may have different conditions and cannot be assumed to combine. Provider verification still applies.",
        )}
      </p>
      <div className="organizer-panel comparison-selectors">
        {[0, 1, 2].map((index) => (
          <label key={index} htmlFor={`compare-${index}`}>
            {t("Scheme {0}", [index + 1])}
            <select
              id={`compare-${index}`}
              aria-label={t("Scheme {0}", [index + 1])}
              value={selection.slugs[index] || ""}
              disabled={catalog.loading}
              onChange={(event) => select(index, event.target.value)}
            >
              <option value="">
                {t(index === 2 ? "Optional third scheme" : "Choose a scheme")}
              </option>
              {catalog.entries.map((item) => (
                <option
                  key={item.slug}
                  value={item.slug}
                  disabled={
                    selection.slugs.includes(item.slug) &&
                    selection.slugs[index] !== item.slug
                  }
                >
                  {item.acronym} · {t(item.name)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="organizer-actions">
        <Button variant="ghost" onClick={() => setParams({})}>
          {t("Clear comparison")}
        </Button>
        <Button variant="secondary" to="/schemes">
          {t("Browse schemes")}
        </Button>
      </div>
      {selection.invalid && (
        <p role="alert" className="organizer-error">
          {t(
            "Some comparison choices were invalid or unavailable. Choose up to three different schemes again.",
          )}
        </p>
      )}
      {catalog.error && (
        <p role="alert" className="organizer-error">
          {t(catalog.error)}{" "}
          <Button onClick={catalog.retry}>{t("Try again")}</Button>
        </p>
      )}
      {loading ? (
        <p role="status">{t("Loading comparison…")}</p>
      ) : state.error ? (
        <div role="alert" className="organizer-error">
          {t(state.error)}{" "}
          <Button onClick={() => setAttempt((value) => value + 1)}>
            {t("Try again")}
          </Button>
        </div>
      ) : selection.slugs.length < 2 ? (
        <p className="organizer-empty">
          {t("Choose at least two schemes to show the comparison.")}
        </p>
      ) : (
        <>
          <ProfileComparison
            key={user?.id || "visitor"}
            user={user}
            slugs={selection.slugs}
            t={t}
          />
          <div
            className="comparison-grid"
            style={{ "--comparison-columns": state.rows.length }}
          >
            {state.rows.map((scheme) => (
              <article
                className="organizer-panel comparison-card"
                key={scheme.slug}
              >
                <span className="eyebrow">
                  {scheme.acronym} · {t(categoryLabel(scheme.category))}
                </span>
                <h2>{t(scheme.name)}</h2>
                <p>{t(scheme.summary)}</p>
                <h3>{t("Benefit")}</h3>
                <strong>{t(scheme.benefitLabel)}</strong>
                <p>{t(scheme.benefitNote)}</p>
                <ul>
                  {scheme.benefits.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ul>
                <h3>{t("Coverage")}</h3>
                <p>
                  {t(
                    scheme.level === "central"
                      ? "Central scheme"
                      : "State scheme",
                  )}{" "}
                  ·{" "}
                  {scheme.level === "central"
                    ? t("All states / UTs")
                    : scheme.states.map((state) => t(state)).join(", ")}
                </p>
                <h3>{t("Eligibility notes")}</h3>
                <ul>
                  {scheme.eligibility.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ul>
                <h3>{t("Document preparation (partial)")}</h3>
                <p>
                  {t(
                    "This is a preparation guide, not the provider’s complete document list.",
                  )}
                </p>
                {scheme.preparation?.items.some(
                  (item) => item.kind === "Document",
                ) ? (
                  <ul>
                    {scheme.preparation.items
                      .filter((item) => item.kind === "Document")
                      .map((item, index) => (
                        <li key={index}>
                          <strong>{t(item.title)}</strong>
                          <p>{t(item.detail)}</p>
                          <a
                            href={item.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t(item.source.title)} ↗
                          </a>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>
                    {t(
                      "No reviewed document preparation guide is available for this entry.",
                    )}
                  </p>
                )}
                <h3>{t("Application steps")}</h3>
                <ol>
                  {scheme.applicationSteps.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ol>
                <h3>{t("Limitations")}</h3>
                <ul>
                  {scheme.caveats.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ul>
                <p>
                  {t("Source review date")}:{" "}
                  <time dateTime={scheme.reviewedAt}>
                    {formatReviewDate(scheme.reviewedAt, locale)}
                  </time>
                </p>
                <h3>{t("Official references")}</h3>
                <ul>
                  {scheme.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(source.title)} ↗
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="organizer-actions">
                  <Button variant="secondary" to={`/schemes/${scheme.slug}`}>
                    {t("Scheme details")}
                  </Button>
                  <a
                    className="button button-ghost"
                    href={scheme.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Official next steps")} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
function ProfileComparison({ user, slugs, t }) {
  const [attempt, setAttempt] = useState(0),
    [state, setState] = useState({ owner: null, report: null, error: "" });
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setState({ owner: user.id, report: null, error: "" });
    api
      .get("/eligibility", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setState({ owner: user.id, report: data, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            owner: user.id,
            report: null,
            error: errorMessage(error),
          });
      });
    return () => controller.abort();
  }, [user?.id, attempt]);
  if (!user)
    return (
      <div className="organizer-panel">
        <p>
          {t(
            "Sign in to compare profile-based screening. Public scheme information remains available without an account.",
          )}
        </p>
        <Button
          to="/login"
          state={{
            from: `/compare?schemes=${slugs.join(",")}`,
          }}
        >
          {t("Sign in")}
        </Button>
      </div>
    );
  return (
    <section className="organizer-panel profile-comparison">
      <h2>{t("Your saved-profile screen")}</h2>
      <p>
        {t(
          "This uses your saved profile only. Additional answers from screening or the shortlist are not imported. Unknown facts stay unknown; this is not an approval decision.",
        )}
      </p>
      {state.error ? (
        <p role="alert">{t(state.error)}</p>
      ) : !state.report ? (
        <p role="status">{t("Checking saved profile…")}</p>
      ) : (
        <div className="comparison-profile-grid">
          {slugs.map((slug) => {
            const result = state.report.results.find(
              (item) => item.slug === slug,
            );
            return (
              <div key={slug}>
                <strong>{result?.acronym || slug}</strong>
                <p>
                  {t(
                    SCREENING_STATUSES[result?.assessment.status]?.label ||
                      "Not screened",
                  )}
                </p>
                {result && (
                  <p>
                    {t("Missing facts")}: {result.assessment.missing.length}
                  </p>
                )}
                <Button variant="ghost" to={`/eligibility?scheme=${slug}`}>
                  {t("Review reasons")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <Button variant="ghost" onClick={() => setAttempt((value) => value + 1)}>
        <RotateCcw size={16} />
        {t("Reload profile screen")}
      </Button>
    </section>
  );
}
