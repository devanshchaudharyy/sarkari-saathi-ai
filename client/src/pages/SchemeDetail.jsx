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
import Button from "../components/Button";
import { schemeIcons } from "../components/SchemeCard";
import useSchemes from "../hooks/useSchemes";
import { categoryLabel, formatReviewDate } from "../../../shared/schemes";
import { useAuth } from "../context/AuthContext";
export default function SchemeDetail() {
  const { user } = useAuth();
  const { slug } = useParams();
  const { search, hash } = useLocation();
  const resource = useSchemes(`/schemes/${encodeURIComponent(slug)}`);
  const scheme = resource.data?.scheme;
  const heading = useRef(null);
  useEffect(() => {
    if (scheme) {
      document.title = `${scheme.acronym} — SarkariSaathi AI`;
      if (hash === "#official-sources") {
        const section = document.getElementById("official-sources");
        section?.scrollIntoView();
        section?.focus({ preventScroll: true });
      } else heading.current?.focus({ preventScroll: true });
    }
  }, [scheme, hash]);
  const Icon = schemeIcons[scheme?.category] || BookOpen;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="scheme-detail container page-enter"
    >
      <Link className="scheme-back" to={`/schemes${search}`}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to schemes
      </Link>
      {resource.loading ? (
        <div className="detail-placeholder" role="status">
          <span className="sr-only">Loading scheme details…</span>
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
            {resource.status === 404
              ? "Scheme not in this catalog"
              : "We couldn’t load this scheme"}
          </h1>
          <p>{resource.error}</p>
          {resource.status !== 404 && (
            <Button onClick={resource.retry}>Try again</Button>
          )}
          <Button to="/schemes" variant="secondary">
            Browse the collection
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
                {categoryLabel(scheme.category)}
                <small>
                  {scheme.level === "central"
                    ? "Central scheme"
                    : "State scheme"}{" "}
                  · {scheme.acronym}
                </small>
              </span>
            </div>
            <h1 ref={heading} tabIndex={-1}>
              {scheme.name}
            </h1>
            <p>{scheme.summary}</p>
            <div className="scheme-detail-meta">
              <span>
                <MapPin size={15} aria-hidden="true" />{" "}
                {scheme.level === "central"
                  ? "Across India"
                  : scheme.states.join(", ")}
              </span>
              <span>
                <CalendarDays size={15} aria-hidden="true" /> Reviewed{" "}
                {formatReviewDate(scheme.reviewedAt)}
              </span>
            </div>
          </header>
          <div className="scheme-detail-layout">
            <div className="scheme-detail-content">
              <section className="scheme-section">
                <span className="eyebrow">01 / THE SUPPORT</span>
                <h2>What the scheme offers</h2>
                <ul className="scheme-benefits-list">
                  {scheme.benefits.map((text) => (
                    <li key={text}>
                      <Check size={17} aria-hidden="true" />
                      <p>{text}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="scheme-section">
                <span className="eyebrow">02 / THE BASICS</span>
                <h2>Who it is intended for</h2>
                <p className="scheme-section-intro">
                  A brief overview of official requirements. This is not a
                  personalised eligibility check.
                </p>
                <ul>
                  {scheme.eligibility.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </section>
              <section className="scheme-section">
                <span className="eyebrow">03 / YOUR NEXT STEP</span>
                <h2>Where to begin</h2>
                <ol className="scheme-steps">
                  {scheme.applicationSteps.map((text, index) => (
                    <li key={text}>
                      <span>{index + 1}</span>
                      <p>{text}</p>
                    </li>
                  ))}
                </ol>
                <div className="scheme-caveats">
                  <Info size={19} aria-hidden="true" />
                  <div>
                    {scheme.caveats.map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                  </div>
                </div>
              </section>
              <section
                className="scheme-section scheme-source-section"
                id="official-sources"
                tabIndex={-1}
              >
                <span className="eyebrow">04 / CHECK THE SOURCE</span>
                <h2>Official references</h2>
                <p className="scheme-section-intro">
                  These summaries were manually reviewed on{" "}
                  {formatReviewDate(scheme.reviewedAt)}. Review dates do not
                  mean the government has reissued a scheme or confirmed your
                  eligibility.
                </p>
                <ul>
                  {scheme.sources.map(({ title, url }) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <BookOpen size={18} aria-hidden="true" />
                        <span>
                          {title}
                          <small>
                            {new URL(url).hostname} · Opens in a new tab
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
                <span className="eyebrow">AT A GLANCE</span>
                <h2>{scheme.benefitLabel}</h2>
                <p>{scheme.benefitNote}</p>
                <div className="scheme-authority">
                  <Landmark size={19} aria-hidden="true" />
                  <div>
                    <small>Responsible department</small>
                    <strong>{scheme.authority}</strong>
                  </div>
                </div>
                <Button
                  href={scheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit official website{" "}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Button>
                <small className="external-caption">
                  Opens {new URL(scheme.officialUrl).hostname} in a new tab.
                </small>
              </div>
              <div className="scheme-independent">
                <Info size={18} aria-hidden="true" />
                <h3>Stay informed. Verify first.</h3>
                <p>
                  SarkariSaathi is an independent project, not an official
                  government service. We don’t accept applications, collect
                  documents or decide eligibility. Use the official provider for
                  current terms and applications.
                </p>
                <a href="#official-sources">
                  Read the references{" "}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
                <Button
                  to={`/eligibility?scheme=${scheme.slug}`}
                  variant="secondary"
                  className="scheme-screen-action"
                >
                  {user
                    ? "Screen basic criteria"
                    : "Sign in to screen criteria"}{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Button>
                <Button
                  to={`/readiness?scheme=${scheme.slug}`}
                  variant="secondary"
                  className="scheme-screen-action"
                >
                  {user ? "Save scheme & prepare" : "Sign in to save & prepare"}{" "}
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
