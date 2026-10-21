import { useLanguage } from "../i18n/useLanguage";
import { useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  MapPin,
  CalendarDays,
  Info,
  Check,
  Landmark,
} from "lucide-react";
import SourceStatus from "../components/SourceStatus";
import Button from "../components/Button";
import { schemeIcons } from "../components/SchemeCard";
import useSchemes from "../hooks/useSchemes";
import { categoryLabel, formatReviewDate } from "../../../shared/schemes";
import { useAuth } from "../context/AuthContext";
export default function SchemeDetail() {
  const { t, language, locale } = useLanguage();
  const { user } = useAuth();
  const { slug } = useParams();
  const { search, hash } = useLocation();
  const resource = useSchemes(`/schemes/${encodeURIComponent(slug)}`);
  const scheme = resource.data?.scheme;
  const heading = useRef(null);
  useEffect(() => {
    if (scheme) {
      document.title = `${t(scheme.name)} — SarkariSaathi AI`;
      if (hash === "#official-sources") {
        const section = document.getElementById("official-sources");
        section?.scrollIntoView();
        section?.focus({
          preventScroll: true,
        });
      } else
        heading.current?.focus({
          preventScroll: true,
        });
    }
  }, [scheme, hash]);
  useEffect(() => {
    if (scheme) document.title = `${t(scheme.name)} — SarkariSaathi AI`;
  }, [scheme, language]);
  const Icon = schemeIcons[scheme?.category] || BookOpen;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="scheme-detail container page-enter"
    >
      <Link className="scheme-back" to={`/schemes${search}`}>
        <ArrowLeft size={16} aria-hidden="true" />
        {t(" Back to schemes")}
      </Link>
      {resource.loading ? (
        <div className="detail-placeholder" role="status">
          <span className="sr-only">{t("Loading scheme details\u2026")}</span>
          <div aria-hidden="true">
            <div className="detail-placeholder-heading">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
            <div className="scheme-detail-layout">
              <div className="detail-placeholder-content">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
              <div className="detail-placeholder-aside">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            </div>
          </div>
        </div>
      ) : resource.error ? (
        <div className="catalog-empty" role="alert">
          <BookOpen size={32} aria-hidden="true" />
          <h1>
            {t(
              resource.status === 404
                ? "Scheme not in this catalog"
                : "We couldn’t load this scheme",
            )}
          </h1>
          <p>{t(resource.error)}</p>
          {resource.status !== 404 && (
            <Button onClick={resource.retry}>{t("Try again")}</Button>
          )}
          <Button to="/schemes" variant="secondary">
            {t("Browse the collection")}
          </Button>
        </div>
      ) : (
        <>
          <header className={`scheme-detail-hero scheme-${scheme.category}`}>
            <div className="scheme-detail-category">
              <span className="scheme-icon">
                <Icon size={26} aria-hidden="true" />
              </span>
              <span>
                {t(categoryLabel(scheme.category))}
                <small>
                  {t(
                    scheme.level === "central"
                      ? "Central scheme"
                      : "State scheme",
                  )}{" "}
                  · {t(scheme.acronym)}
                </small>
              </span>
            </div>
            <h1 ref={heading} tabIndex={-1}>
              {t(scheme.name)}
            </h1>
            <p>{t(scheme.summary)}</p>
            <Button to={`/compare?schemes=${scheme.slug}`} variant="secondary">
              {t("Compare this scheme")}
            </Button>
            {scheme.screeningSuspended && (
              <p role="note" className="organizer-notice">
                {t(
                  "This content was republished. Screening and preparation templates await a separate review; use the official sources for current requirements.",
                )}
              </p>
            )}
            <div className="scheme-detail-meta">
              <span>
                <MapPin size={15} aria-hidden="true" />{" "}
                {t(
                  scheme.level === "central"
                    ? "Across India"
                    : scheme.states.join(", "),
                )}
              </span>
              <span>
                <CalendarDays size={15} aria-hidden="true" />
                {t(" Reviewed")}{" "}
                {t(formatReviewDate(scheme.reviewedAt, locale))}
              </span>
            </div>
          </header>
          <div className="scheme-detail-layout">
            <div className="scheme-detail-content">
              <section className="scheme-section">
                <span className="eyebrow">{t("01 / THE SUPPORT")}</span>
                <h2>{t("What the scheme offers")}</h2>
                <ul className="scheme-benefits-list">
                  {scheme.benefits.map((text) => (
                    <li key={text}>
                      <Check size={17} aria-hidden="true" />
                      <p>{t(text)}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="scheme-section">
                <span className="eyebrow">{t("02 / THE BASICS")}</span>
                <h2>{t("Who it is intended for")}</h2>
                <p className="scheme-section-intro">
                  {t(
                    "A brief overview of official requirements. This is not a personalised eligibility check.",
                  )}
                </p>
                <ul>
                  {scheme.eligibility.map((text) => (
                    <li key={text}>{t(text)}</li>
                  ))}
                </ul>
              </section>
              <section className="scheme-section">
                <span className="eyebrow">{t("03 / YOUR NEXT STEP")}</span>
                <h2>{t("Where to begin")}</h2>
                <ol className="scheme-steps">
                  {scheme.applicationSteps.map((text, index) => (
                    <li key={text}>
                      <span>{t(index + 1)}</span>
                      <p>{t(text)}</p>
                    </li>
                  ))}
                </ol>
                <div className="scheme-caveats">
                  <Info size={19} aria-hidden="true" />
                  <div>
                    {scheme.caveats.map((text) => (
                      <p key={text}>{t(text)}</p>
                    ))}
                  </div>
                </div>
              </section>
              <SourceStatus reliability={scheme.reliability} />
              <section
                className="scheme-section scheme-source-section"
                id="official-sources"
                tabIndex={-1}
              >
                <span className="eyebrow">{t("04 / CHECK THE SOURCE")}</span>
                <h2>{t("Official references")}</h2>
                <p className="scheme-section-intro">
                  {t("These summaries were manually reviewed on")}{" "}
                  {t(formatReviewDate(scheme.reviewedAt, locale))}
                  {t(
                    ". Review dates do not mean the government has reissued a scheme or confirmed your eligibility.",
                  )}
                </p>
                <ul>
                  {scheme.sources.map(({ title, url }) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <BookOpen size={18} aria-hidden="true" />
                        <span>
                          {t(title)}
                          <small>
                            {t(new URL(url).hostname)}
                            {t(" \xB7 Opens in a new tab")}
                          </small>
                        </span>
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <aside className="scheme-detail-aside">
              <div className="scheme-official-card">
                <span className="eyebrow">{t("AT A GLANCE")}</span>
                <h2>{t(scheme.benefitLabel)}</h2>
                <p>{t(scheme.benefitNote)}</p>
                <div className="scheme-authority">
                  <Landmark size={19} aria-hidden="true" />
                  <div>
                    <small>{t("Responsible department")}</small>
                    <strong>{t(scheme.authority)}</strong>
                  </div>
                </div>
                <Button
                  href={scheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("Visit official website")}{" "}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Button>
                <small className="external-caption">
                  {t("Opens ")}
                  {t(new URL(scheme.officialUrl).hostname)}
                  {t(" in a new tab.")}
                </small>
              </div>
              <Button
                to={`/schemes/${scheme.slug}/documents`}
                variant="secondary"
              >
                {t("Help obtaining documents")}
              </Button>
              <div className="scheme-independent">
                <Info size={18} aria-hidden="true" />
                <h3>{t("Stay informed. Verify first.")}</h3>
                <p>
                  {t(
                    "SarkariSaathi is an independent project, not an official government service. We don\u2019t accept applications, collect documents or decide eligibility. Use the official provider for current terms and applications.",
                  )}
                </p>
                <a href="#official-sources">
                  {t("Read the references")}{" "}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <Button
                  to={`/eligibility?scheme=${scheme.slug}`}
                  variant="secondary"
                  className="scheme-screen-action"
                >
                  {t(
                    user
                      ? "Screen basic criteria"
                      : "Sign in to screen criteria",
                  )}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Button>
                <Button
                  to={`/readiness?scheme=${scheme.slug}`}
                  variant="secondary"
                  className="scheme-screen-action"
                >
                  {t(
                    user
                      ? "Save scheme & prepare"
                      : "Sign in to save & prepare",
                  )}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
