import { useEffect, useRef } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FileSearch, ArrowUpRight, Landmark } from "lucide-react";
import useSchemes from "../hooks/useSchemes";
import { useLanguage } from "../i18n/useLanguage";
import SourceStatus from "../components/SourceStatus";
import Button from "../components/Button";
import Loader from "../components/Loader";
export default function Documents() {
  const { slug } = useParams(),
    { search } = useLocation(),
    { t, locale } = useLanguage();
  const resource = useSchemes(`/schemes/${encodeURIComponent(slug)}/documents`),
    heading = useRef(null),
    target = useRef(null);
  const scheme = resource.data?.scheme,
    guide = resource.data?.guide;
  const query = new URLSearchParams(search),
    item = query.get("item");
  const validQuery =
    [...query.keys()].every((k) => k === "item") &&
    query.getAll("item").length <= 1 &&
    (!item || guide?.items.some((g) => g.id === item));
  useEffect(() => {
    if (scheme)
      document.title = `${t("Document help")} — ${t(scheme.name)} — SarkariSaathi`;
  }, [scheme, locale, t]);
  useEffect(() => {
    if (guide) {
      if (item && validQuery && target.current) {
        target.current.scrollIntoView({ block: "start" });
        target.current.focus({ preventScroll: true });
      } else heading.current?.focus({ preventScroll: true });
    }
  }, [guide, item, validQuery]);
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="container document-page page-enter"
    >
      <Link to={`/schemes/${slug}`} className="scheme-back">
        {t("Back to scheme details")}
      </Link>
      <header>
        <span className="eyebrow">
          <FileSearch size={18} />
          {t("A PRACTICAL NEXT STEP")}
        </span>
        <h1 ref={heading} tabIndex={-1}>
          {t("Help obtaining documents")}
        </h1>
        <p>
          {scheme
            ? t(scheme.name)
            : t("Official guidance for your preparation")}
        </p>
      </header>
      <p className="organizer-notice">
        {t(
          "These are partial preparation guides. We do not collect documents, identity numbers or bank details. The issuing authority determines current requirements and acceptance.",
        )}
      </p>
      <SourceStatus reliability={resource.data?.reliability} />
      {resource.loading ? (
        <Loader />
      ) : resource.error ? (
        <div role="alert" className="organizer-error">
          <p>{t(resource.error)}</p>
          <Button onClick={resource.retry}>{t("Try again")}</Button>
        </div>
      ) : (
        <>
          {!validQuery && (
            <p role="note" className="readiness-warning">
              {t(
                "That document choice is unavailable. The current guides are shown below.",
              )}
            </p>
          )}
          {!guide.available ? (
            <section className="organizer-panel">
              <h2>{t("No reviewed document guide is available")}</h2>
              <p>
                {t(
                  "Ask the official provider for current instructions. This page does not invent an issuing process for an unsupported or revised scheme.",
                )}
              </p>
              <Button
                href={scheme.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Visit official website")}
              </Button>
            </section>
          ) : (
            <>
              <p className="document-review">
                {t("Guide reviewed")}:{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(guide.reviewedAt + "T00:00:00Z"))}{" "}
                · {guide.version}
              </p>
              <nav aria-label={t("Document guides")} className="document-jump">
                {guide.items.map((row) => (
                  <Link key={row.id} to={`?item=${row.id}`}>
                    {t(row.title)}
                  </Link>
                ))}
              </nav>
              <div className="document-guides">
                {guide.items.map((row) => (
                  <article
                    className="organizer-panel document-guide"
                    key={row.id}
                    ref={item === row.id ? target : undefined}
                    tabIndex={-1}
                    aria-label={t(row.title)}
                  >
                    <span className="eyebrow">{t("DOCUMENT GUIDE")}</span>
                    <h2>{t(row.title)}</h2>
                    <div className="document-issuer">
                      <Landmark size={21} aria-hidden="true" />
                      <p>
                        <strong>{t("Issuing or receiving authority")}</strong>
                        <br />
                        {t(row.issuer)}
                      </p>
                    </div>
                    <h3>{t("Before you start")}</h3>
                    <ul>
                      {row.prerequisites.map((x) => (
                        <li key={x}>{t(x)}</li>
                      ))}
                    </ul>
                    <h3>{t("How to proceed")}</h3>
                    <ol>
                      {row.steps.map((x) => (
                        <li key={x}>{t(x)}</li>
                      ))}
                    </ol>
                    <div className="document-facts">
                      <section>
                        <h3>{t("Fees")}</h3>
                        <span className="badge">
                          {t(
                            row.fee.status === "published"
                              ? "Published by the authority"
                              : "Not verified here",
                          )}
                        </span>
                        <p>{t(row.fee.text)}</p>
                      </section>
                      <section>
                        <h3>{t("Validity and acceptance")}</h3>
                        <p>{t(row.validity)}</p>
                      </section>
                    </div>
                    <p className="readiness-warning">{t(row.caution)}</p>
                    <h3>{t("Official instructions")}</h3>
                    {row.sources.map((source) => (
                      <a
                        className="document-source"
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>
                          {t(source.title)}
                          <small>
                            {new URL(source.url).hostname} ·{" "}
                            {t("opens in a new tab")}
                          </small>
                        </span>
                        <ArrowUpRight size={18} />
                      </a>
                    ))}
                    <Button
                      to={`/readiness?scheme=${scheme.slug}`}
                      variant="secondary"
                    >
                      {t("Return to preparation")}
                    </Button>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
