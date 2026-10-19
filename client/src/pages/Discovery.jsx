import { useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Compass,
  ArrowRight,
  RotateCcw,
  Info,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
import useEligibility from "../hooks/useEligibility";
import useDiscovery from "../hooks/useDiscovery";
import Button from "../components/Button";
import AssessmentCard from "../components/AssessmentCard";
import ScreeningQuestion from "../components/ScreeningQuestion";
import {
  DISCOVERY_GROUPS,
  discoveryCounts,
  groupDiscovery,
  discoveryView,
} from "../../../shared/discovery";
import { SCHEME_CATEGORIES } from "../../../shared/schemes";

export default function Discovery() {
  const { t } = useLanguage(),
    { user } = useAuth(),
    resource = useEligibility();
  return (
    <div className="discovery-page page-enter">
      <header className="discovery-heading">
        <span className="eyebrow">
          <Compass size={15} /> {t("YOUR FACTS. A CLEARER STARTING POINT.")}
        </span>
        <h1>
          {t("Your possibilities,")}
          <br />
          <span>{t("with the reasons in view.")}</span>
        </h1>
        <p>
          {t(
            "An explainable shortlist from the reviewed catalog. Start with your saved profile, then clarify only what you know.",
          )}
        </p>
      </header>
      <div className="discovery-boundary">
        <ShieldCheck size={21} />
        <p>
          {t(
            "This is a partial screen for new applications, not an approval, entitlement or recommendation to apply. Missing information is kept separate from basic matches. Official verification still applies.",
          )}
        </p>
      </div>
      {resource.loading ? (
        <div className="screening-loading" role="status">
          <Compass size={25} />
          <span>{t("Organizing the reviewed schemes")}</span>
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ) : resource.error ? (
        <div className="profile-load-error" role="alert">
          <h2>{t("We couldn’t prepare your shortlist")}</h2>
          <p>{t(resource.error)}</p>
          <Button onClick={resource.retry}>{t("Try again")}</Button>
        </div>
      ) : (
        <DiscoverySession
          key={user.id}
          initial={resource.data}
          reload={resource.retry}
        />
      )}
    </div>
  );
}
function DiscoverySession({ initial, reload }) {
  const { t, locale } = useLanguage();
  const session = useDiscovery(initial),
    { report, answers, busy, dirty } = session;
  const [params, setParams] = useSearchParams();
  const { category, status, selected, invalid } = discoveryView(
    params,
    report.results,
  );
  const [refineOpen, setRefineOpen] = useState(!!params.get("scheme"));
  const heading = useRef(null),
    questionHeading = useRef(null),
    focusQuestions = useRef(false);
  const questions = report.questions.filter(
    (question) =>
      (selected === "all" || question.schemes.includes(selected)) &&
      (!question.ageCondition || report.profile.age === question.ageCondition),
  );
  const questionGroups = [
    ...new Set(questions.map((question) => question.group)),
  ];
  const groups = groupDiscovery(report.results, { category, status }),
    counts = discoveryCounts(report.results);
  const visible = groups.reduce((sum, group) => sum + group.entries.length, 0);
  useLayoutEffect(() => {
    if (focusQuestions.current && refineOpen) {
      questionHeading.current?.focus({ preventScroll: true });
      questionHeading.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
      focusQuestions.current = false;
    }
  });
  function change(key, value) {
    const next = new URLSearchParams(params);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next);
  }
  function clarify(slug) {
    focusQuestions.current = true;
    setRefineOpen(true);
    change("scheme", slug);
  }
  const missingProfile = [
    report.profile.age,
    report.profile.state,
    report.profile.annualHouseholdIncome,
  ].some((value) => value === null);
  return (
    <>
      <section
        className="discovery-profile"
        aria-label={t("Profile facts used for this shortlist")}
      >
        <div>
          <span className="eyebrow">{t("YOUR SAVED STARTING POINT")}</span>
          <h2>
            {t(
              missingProfile
                ? "A few profile details are still missing."
                : "Built from your saved details.",
            )}
          </h2>
          <p>
            {t("Age")}: {report.profile.age ?? t("Not added")} ·{" "}
            {t("State / UT")}: {t(report.profile.state || "Not added")} ·{" "}
            {t("Household income / year")}:{" "}
            {report.profile.annualHouseholdIncome === null
              ? t("Not added")
              : `₹${report.profile.annualHouseholdIncome.toLocaleString(locale)}`}
          </p>
        </div>
        <div className="discovery-profile-actions">
          <Button to="/profile" variant="secondary">
            {t(missingProfile ? "Add profile details" : "Edit profile")}
          </Button>
          <Button onClick={reload} disabled={busy} variant="ghost">
            <RotateCcw size={15} />
            {t("Reload saved details (resets answers)")}
          </Button>
        </div>
      </section>
      <details className="discovery-method">
        <summary>
          <Info size={17} />
          {t("How this view is organized")}
          <ChevronDown size={16} />
        </summary>
        <p>
          {t(
            "The existing screening rules group schemes by their checked status: basic matches, missing information, unmet conditions, then entries without reviewed rules. Names stay alphabetical within each group. There are no hidden weights, approval probabilities or AI scores.",
          )}
        </p>
        <p>
          {t(
            "Only the reviewed catalog is included. Income does not imply tax status, occupation does not imply land ownership, and an account holder’s age is not a girl beneficiary’s age.",
          )}
        </p>
      </details>
      <details
        className="discovery-refine"
        open={refineOpen}
        onToggle={(event) => setRefineOpen(event.currentTarget.open)}
      >
        <summary>
          <SlidersHorizontal size={18} />
          <span>
            {t("Clarify missing information")}
            <small>{t("Optional answers. Only for this page visit.")}</small>
          </span>
          <ChevronDown size={17} />
        </summary>
        {refineOpen && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (await session.check()) {
                heading.current?.focus({ preventScroll: true });
                heading.current?.scrollIntoView({
                  block: "start",
                  behavior: "instant",
                });
              }
            }}
            aria-label={t("Shortlist clarification answers")}
          >
            <h2 ref={questionHeading} tabIndex={-1}>
              {t("Answer only what you know.")}
            </h2>
            <p>
              {t(
                "Leave Not sure when you need provider clarification. Changing an answer hides the previous shortlist until you update it.",
              )}
            </p>
            <label
              className="discovery-question-select"
              htmlFor="discovery-scheme"
            >
              {t("Choose a scheme")}
              <select
                id="discovery-scheme"
                aria-label={t("Choose a scheme")}
                value={selected}
                disabled={busy}
                onChange={(event) => change("scheme", event.target.value)}
              >
                <option value="all">{t("All schemes in this catalog")}</option>
                {report.results.map((result) => (
                  <option key={result.slug} value={result.slug}>
                    {result.acronym} · {t(result.name)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset disabled={busy} className="discovery-fields">
              <legend className="sr-only">
                {t("Additional scheme facts")}
              </legend>
              {questionGroups.map((group) => (
                <details
                  key={`${selected}-${group}`}
                  className="question-group"
                  open={selected !== "all" || undefined}
                >
                  <summary>
                    <span>{t(group)}</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div>
                    {questions
                      .filter((question) => question.group === group)
                      .map((question) => (
                        <div key={question.key}>
                          <ScreeningQuestion
                            question={question}
                            answers={answers}
                            onChange={session.update}
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
            {session.error && (
              <p role="alert" className="screening-error">
                {t(session.error)}
              </p>
            )}
            <div className="discovery-form-actions">
              <Button type="submit" loading={busy}>
                {t(busy ? "Checking…" : "Update shortlist")}
                <ArrowRight size={16} />
              </Button>
              <Button
                type="button"
                onClick={session.reset}
                disabled={busy}
                variant="ghost"
              >
                {t("Reset answers")}
              </Button>
            </div>
            <p className="screening-ephemeral">
              <ShieldCheck size={15} />
              {t(
                "Answers are sent to the existing screening API but are not saved in your account or browser. They reset on refresh, navigation or account change; answers from the separate screening page are not imported.",
              )}
            </p>
          </form>
        )}
      </details>
      <section
        className="discovery-results"
        aria-label={t("Your grouped shortlist")}
      >
        <div className="discovery-results-heading">
          <div>
            <span className="eyebrow">{t("REASONS BEFORE NEXT STEPS")}</span>
            <h2 ref={heading} tabIndex={-1}>
              {t("Your grouped shortlist")}
            </h2>
          </div>
          <Button to="/schemes" variant="ghost">
            {t("Browse the full catalog")}
            <ArrowRight size={15} />
          </Button>
        </div>
        {busy || dirty ? (
          <div className="discovery-stale" role="status">
            <RotateCcw size={24} />
            <h3>
              {t(
                busy ? "Checking the supplied facts…" : "Your answers changed.",
              )}
            </h3>
            <p>
              {t(
                "Update the shortlist to see current groups and counts. Previous results are hidden until this check is confirmed.",
              )}
            </p>
            <Button
              disabled={busy}
              onClick={() => {
                focusQuestions.current = true;
                setRefineOpen(true);
                if (refineOpen) questionHeading.current?.focus();
              }}
              variant="secondary"
            >
              {t("Return to clarification answers")}
            </Button>
          </div>
        ) : (
          <>
            <div
              className="discovery-counts"
              aria-label={t("Counts for the full catalog")}
            >
              {DISCOVERY_GROUPS.map((group) => (
                <button
                  type="button"
                  key={group.status}
                  className={`discovery-count discovery-${group.tone}`}
                  aria-pressed={status === group.status}
                  onClick={() =>
                    change(
                      "status",
                      status === group.status ? "all" : group.status,
                    )
                  }
                >
                  <strong>{counts[group.status]}</strong>
                  <span>{t(group.title)}</span>
                </button>
              ))}
            </div>
            <p className="discovery-count-caption">
              {t(
                "Counts cover the full catalog. Filters change only the visible list, never the screening decision.",
              )}
            </p>
            <div className="discovery-filters">
              <label htmlFor="discovery-category">
                {t("Category")}
                <select
                  id="discovery-category"
                  aria-label={t("Category")}
                  value={category}
                  onChange={(event) => change("category", event.target.value)}
                >
                  <option value="all">{t("All categories")}</option>
                  {SCHEME_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {t(item.label)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="discovery-status">
                {t("Checked status")}
                <select
                  id="discovery-status"
                  aria-label={t("Checked status")}
                  value={status}
                  onChange={(event) => change("status", event.target.value)}
                >
                  <option value="all">{t("All checked statuses")}</option>
                  {DISCOVERY_GROUPS.map((group) => (
                    <option key={group.status} value={group.status}>
                      {t(group.title)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="ghost"
                onClick={() => {
                  const next = new URLSearchParams();
                  if (selected !== "all") next.set("scheme", selected);
                  setParams(next);
                }}
              >
                {t("Clear view filters")}
              </Button>
            </div>
            {invalid && (
              <p className="readiness-warning" role="status">
                {t(
                  "Some view filters were not recognized and were ignored. Clear view filters to reset this view.",
                )}
              </p>
            )}
            <p className="discovery-view-count" role="status">
              {t("{0} of {1} catalog entries shown", [
                visible,
                report.results.length,
              ])}{" "}
              ·{" "}
              {t(
                session.hasExtraAnswers
                  ? "Profile and this visit’s answers"
                  : "Saved profile only; other facts unknown",
              )}
            </p>
            {visible ? (
              groups
                .filter((group) => group.entries.length)
                .map((group) => (
                  <section
                    className={`discovery-group discovery-${group.tone}`}
                    key={group.status}
                    aria-label={t(group.title)}
                  >
                    <header>
                      <span className="discovery-group-number">
                        {group.entries.length}
                      </span>
                      <div>
                        <h2>{t(group.title)}</h2>
                        <p>{t(group.description)}</p>
                      </div>
                    </header>
                    <div className="assessment-grid">
                      {group.entries.map((result) => (
                        <AssessmentCard
                          key={result.slug}
                          result={result}
                          onQuestions={clarify}
                        />
                      ))}
                    </div>
                  </section>
                ))
            ) : (
              <div className="readiness-empty">
                <Compass size={28} />
                <h3>
                  {t(
                    report.results.length
                      ? "No entries in this view"
                      : "The reviewed catalog is empty",
                  )}
                </h3>
                <p>
                  {t(
                    report.results.length
                      ? "Try another status or category, or clear the view filters. No schemes have been removed from the catalog."
                      : "No scheme results are invented. Load the reviewed catalog before building a shortlist.",
                  )}
                </p>
              </div>
            )}
            <p className="discovery-check-stamp">
              {t("Checked")}{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
              }).format(new Date(report.checkedAt))}{" "}
              · {t("Rule review")} {report.reviewedAt} · {report.ruleVersion}
            </p>
          </>
        )}
      </section>
    </>
  );
}
