import { useLanguage } from "../i18n/useLanguage";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ListChecks,
  ShieldCheck,
  ArrowRight,
  Info,
  RotateCcw,
  ChevronDown,
  UserRound,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import api, { errorMessage } from "../api/axios";
import useEligibility from "../hooks/useEligibility";
import Button from "../components/Button";
import AssessmentCard from "../components/AssessmentCard";
import ScreeningQuestion from "../components/ScreeningQuestion";
import { useAuth } from "../context/AuthContext";
import { SCREENING_STATUSES } from "../../../shared/eligibility";
export default function Eligibility() {
  const { t } = useLanguage();
  const resource = useEligibility();
  const { user } = useAuth();
  return (
    <div className="eligibility-page page-enter">
      <header className="screening-heading">
        <span className="eyebrow">
          <ListChecks size={15} aria-hidden="true" />
          {t(" CLARITY, ONE REQUIREMENT AT A TIME")}
        </span>
        <h1>
          {t("A clearer view of")}
          <br />
          <span>{t("where you stand.")}</span>
        </h1>
        <p>
          {t("Check basic scheme requirements against your saved details.")}
          <br className="desktop-break" />
          {t(
            " See what matches, what\u2019s missing, and what to verify next.",
          )}
        </p>
      </header>
      <div className="screening-notice">
        <Info size={20} aria-hidden="true" />
        <p>
          {t(
            "For new applications. This is partial screening, not an official eligibility decision or approval. Your details are self-reported; other conditions and provider verification still apply.",
          )}
        </p>
      </div>
      {resource.loading ? (
        <div className="screening-loading" role="status">
          <ListChecks size={25} aria-hidden="true" />
          <span>{t("Preparing your screening workspace")}</span>
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ) : resource.error ? (
        <div className="profile-load-error" role="alert">
          <h2>{t("We couldn\u2019t prepare your screening")}</h2>
          <p>{t(resource.error)}</p>
          <Button onClick={resource.retry}>{t("Try again")}</Button>
        </div>
      ) : (
        <EligibilityForm
          key={user.id}
          initial={resource.data}
          reload={resource.retry}
        />
      )}
    </div>
  );
}
function EligibilityForm({ initial, reload }) {
  const { t, locale } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [answers, setAnswers] = useState({});
  const [report, setReport] = useState(initial);
  const [submitted, setSubmitted] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef(null),
    focusResults = useRef(false),
    resultsHeading = useRef(null),
    questionsHeading = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  const requested = params.get("scheme");
  const selected = report.results.some((result) => result.slug === requested)
    ? requested
    : "all";
  const results = report.results.filter(
    (result) => selected === "all" || result.slug === selected,
  );
  const questions = report.questions.filter(
    (question) =>
      (selected === "all" || question.schemes.includes(selected)) &&
      (!question.ageCondition || report.profile.age === question.ageCondition),
  );
  const groups = [...new Set(questions.map((question) => question.group))];
  const dirty = JSON.stringify(answers) !== submitted;
  useLayoutEffect(() => {
    if (focusResults.current && !busy && !dirty) {
      focusResults.current = false;
      focusSection(resultsHeading);
    }
  });
  function chooseScheme(slug) {
    const next = new URLSearchParams();
    if (slug !== "all") next.set("scheme", slug);
    setParams(next);
  }
  function update(key, value) {
    setAnswers((current) => ({
      ...current,
      [key]: value,
      ...(key === "upStage"
        ? {
            upStageRequirementsMet: null,
          }
        : {}),
    }));
    setError("");
  }
  function focusSection(ref) {
    ref.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    ref.current?.focus({
      preventScroll: true,
    });
  }
  async function check(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    const payload = {
      answers: {
        ...answers,
      },
    };
    try {
      const { data } = await api.post("/eligibility", payload, {
        signal: requestController.signal,
      });
      if (requestController.signal.aborted) return;
      focusResults.current = true;
      setReport(data);
      setSubmitted(JSON.stringify(payload.answers));
      toast.success(
        t("Screening updated. Review the reasons and remaining conditions."),
      );
    } catch (error) {
      if (requestController.signal.aborted) return;
      setError(`${errorMessage(error)} Your answers are still here.`);
      toast.error(t("Screening could not be updated."));
    } finally {
      if (!requestController.signal.aborted) setBusy(false);
    }
  }
  const missingProfile =
    report.profile.age === null ||
    report.profile.state === null ||
    report.profile.annualHouseholdIncome === null;
  return (
    <>
      <section
        className="screening-profile"
        aria-label={t("Saved profile used for screening")}
      >
        <div className="screening-profile-title">
          <UserRound size={19} aria-hidden="true" />
          <div>
            <strong>{t("Your saved starting details")}</strong>
            <span>
              {t(
                report.profile.updatedAt
                  ? "Snapshot used for the last screen"
                  : "No profile saved yet",
              )}
            </span>
          </div>
        </div>
        <dl>
          <div>
            <dt>{t("Your age")}</dt>
            <dd>{t(report.profile.age ?? "Not added")}</dd>
          </div>
          <div>
            <dt>{t("State / UT")}</dt>
            <dd>{t(report.profile.state || "Not added")}</dd>
          </div>
          <div>
            <dt>{t("Household income / year")}</dt>
            <dd>
              {t(
                report.profile.annualHouseholdIncome === null
                  ? "Not added"
                  : `₹${report.profile.annualHouseholdIncome.toLocaleString(locale)}`,
              )}
            </dd>
          </div>
        </dl>
        <div className="screening-profile-actions">
          <Button to="/profile" variant="ghost">
            {t(missingProfile ? "Add profile details" : "Edit profile")}{" "}
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
          <button onClick={reload} disabled={busy}>
            {t("Reload saved details (resets answers)")}
          </button>
        </div>
      </section>
      <div className="screening-layout">
        <form
          onSubmit={check}
          className="screening-form"
          aria-label={t("Scheme screening answers")}
        >
          <div className="screening-form-top">
            <span className="eyebrow">{t("01 / FILL THE GAPS")}</span>
            <h2 ref={questionsHeading} tabIndex={-1}>
              {t("A few facts your profile can\u2019t tell us.")}
            </h2>
            <p>{t("Answer only what you know. Not sure is a valid answer.")}</p>
            <label htmlFor="screening-scheme">{t("Choose a scheme")}</label>
            <select
              id="screening-scheme"
              value={selected}
              onChange={(event) => chooseScheme(event.target.value)}
              disabled={busy}
            >
              <option value="all">{t("All schemes in this catalog")}</option>
              {report.results.map((result) => (
                <option key={result.slug} value={result.slug}>
                  {t(result.acronym)} · {t(result.name)}
                </option>
              ))}
            </select>
            {requested && selected === "all" && (
              <p className="screening-view-hint">
                {t(
                  "That scheme isn\u2019t in the loaded catalog. Showing the full collection.",
                )}
              </p>
            )}
          </div>
          <fieldset className="screening-fields" disabled={busy}>
            <legend className="sr-only">{t("Additional scheme facts")}</legend>
            {groups.map((group) => (
              <details
                className="question-group"
                key={`${selected}-${group}`}
                open={selected !== "all" || undefined}
              >
                <summary>
                  <span>
                    {t(group)}
                    <small>
                      {t(
                        questions.filter((question) => question.group === group)
                          .length,
                      )}{" "}
                      {t("questions")}
                    </small>
                  </span>
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div>
                  {questions
                    .filter((question) => question.group === group)
                    .map((question) => (
                      <div key={question.key}>
                        <ScreeningQuestion
                          question={question}
                          answers={answers}
                          onChange={update}
                        />
                        {question.type === "stage" && answers.upStage && (
                          <p className="stage-requirement" role="note">
                            {t(
                              question.options.find(
                                (stage) => stage.value === answers.upStage,
                              )?.requirement,
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </details>
            ))}
          </fieldset>
          {error && (
            <div role="alert" className="screening-error">
              {t(error)}
            </div>
          )}
          <div className="screening-submit">
            <Button type="submit" loading={busy}>
              {t(busy ? "Checking…" : "Run screening")}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAnswers({});
                setError("");
              }}
            >
              {t("Reset answers ")}
              <RotateCcw size={14} aria-hidden="true" />
            </Button>
          </div>
          <p className="screening-ephemeral">
            <ShieldCheck size={15} aria-hidden="true" />
            {t(
              " Additional answers are sent for this check but aren\u2019t saved to your account or browser storage. They reset when you leave or refresh.",
            )}
          </p>
        </form>
        <aside className="screening-guide">
          <span className="icon-box indigo">
            <ListChecks size={23} aria-hidden="true" />
          </span>
          <h2>
            {t("Understand the result,")}
            <br />
            {t("not just the label.")}
          </h2>
          <ul>
            {Object.entries(SCREENING_STATUSES)
              .filter(([key]) => key !== "not_assessed")
              .map(([key, status]) => (
                <li key={key} className={`guide-${key}`}>
                  <span className="guide-dot" />
                  <div>
                    <strong>{t(status.label)}</strong>
                    <p>{t(status.description)}</p>
                  </div>
                </li>
              ))}
          </ul>
          <div className="screening-guide-note">
            <Info size={17} aria-hidden="true" />
            <p>
              {t(
                "We don\u2019t infer citizenship, tax status, land ownership or a girl\u2019s circumstances from your age, income or occupation. Official sources sit behind each checked requirement.",
              )}
            </p>
          </div>
        </aside>
      </div>
      <section
        className="screening-results"
        aria-label={t("Screening results")}
      >
        <div className="screening-results-heading">
          <div>
            <span className="eyebrow">{t("02 / SEE THE REASONS")}</span>
            <h2 ref={resultsHeading} tabIndex={-1}>
              {t("Your screening overview")}
            </h2>
          </div>
          <span>
            {t(results.length)} {t(results.length === 1 ? "scheme" : "schemes")}
            {t(" \xB7 Alphabetical order")}
          </span>
        </div>
        {busy ? (
          <div className="screening-loading" role="status">
            <span>{t("Checking saved details and your answers")}</span>
            <div className="skeleton-line" />
          </div>
        ) : dirty ? (
          <div className="screening-stale" role="status">
            <RotateCcw size={23} aria-hidden="true" />
            <div>
              <h3>{t("Your answers changed.")}</h3>
              <p>
                {t(
                  "Run screening to update the results. Previous results are hidden so they aren\u2019t mistaken for the current answers.",
                )}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="screening-counts">
              {Object.entries(SCREENING_STATUSES)
                .filter(
                  ([key]) =>
                    key !== "not_assessed" ||
                    results.some((result) => result.assessment.status === key),
                )
                .map(([key, status]) => (
                  <div className={`count-${key}`} key={key}>
                    <strong>
                      {t(
                        results.filter(
                          (result) => result.assessment.status === key,
                        ).length,
                      )}
                    </strong>
                    <span>{t(status.label)}</span>
                  </div>
                ))}
            </div>
            {results.length === 0 ? (
              <div className="catalog-empty">
                <h3>{t("No catalog entries to screen yet.")}</h3>
                <p>
                  {t(
                    "The scheme library needs to be loaded before screening is available.",
                  )}
                </p>
              </div>
            ) : (
              <div className="assessment-grid">
                {results.map((result) => (
                  <AssessmentCard
                    key={result.slug}
                    result={result}
                    onQuestions={(slug) => {
                      chooseScheme(slug);
                      focusSection(questionsHeading);
                    }}
                  />
                ))}
              </div>
            )}
            <p className="screening-check-stamp">
              <Check size={14} aria-hidden="true" />
              {t(" Checked")}{" "}
              {t(
                new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(report.checkedAt)),
              )}{" "}
              {t("IST \xB7 Rule version ")}
              {t(report.ruleVersion)}
            </p>
          </>
        )}
      </section>
    </>
  );
}
