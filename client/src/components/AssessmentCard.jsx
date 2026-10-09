import {
  Check,
  HelpCircle,
  Minus,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import Button from "./Button";
import { SCREENING_STATUSES } from "../../../shared/eligibility";
import { categoryLabel } from "../../../shared/schemes";
const profileLabels = {
  age: "Age",
  state: "State / Union Territory",
  annualHouseholdIncome: "Annual household income",
};
export default function AssessmentCard({ result, onQuestions }) {
  const assessment = result.assessment;
  const status = SCREENING_STATUSES[assessment.status];
  const Icon =
    assessment.status === "basic_match"
      ? Check
      : assessment.status === "criteria_not_met"
        ? Minus
        : HelpCircle;
  return (
    <article className={`assessment-card assessment-${assessment.status}`}>
      <div className="assessment-top">
        <span className="assessment-category">
          {categoryLabel(result.category)} · {result.acronym}
        </span>
        <span className="assessment-status">
          <Icon size={14} aria-hidden="true" /> {status.label}
        </span>
      </div>
      <h3>{result.name}</h3>
      <p className="assessment-description">{status.description}</p>
      {assessment.rules.length > 0 && (
        <div className="assessment-rule-count">
          {assessment.rules.filter((rule) => rule.status === "met").length} met
          ·{" "}
          {assessment.rules.filter((rule) => rule.status === "unknown").length}{" "}
          need information ·{" "}
          {assessment.rules.filter((rule) => rule.status === "not_met").length}{" "}
          not met
        </div>
      )}
      <details className="assessment-reasons">
        <summary>
          Review reasons
          {assessment.rules.length ? ` (${assessment.rules.length})` : ""}
        </summary>
        <ul>
          {assessment.rules.map((rule) => {
            const RuleIcon =
              rule.status === "met"
                ? Check
                : rule.status === "not_met"
                  ? Minus
                  : HelpCircle;
            return (
              <li key={rule.id} className={`rule-${rule.status}`}>
                <RuleIcon size={16} aria-hidden="true" />
                <div>
                  <strong>
                    {rule.label}{" "}
                    <small>
                      {rule.status === "met"
                        ? "Met"
                        : rule.status === "not_met"
                          ? "Not met"
                          : "Needs information"}
                    </small>
                  </strong>
                  <p>{rule.reason}</p>
                  <a
                    href={rule.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Rule source <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="assessment-limitations">
          {assessment.limitations.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      </details>
      {assessment.missing.length > 0 && (
        <div className="assessment-missing">
          <strong>To clarify this result</strong>
          {assessment.missing.some((item) => item.origin === "profile") && (
            <p>
              Profile:{" "}
              {assessment.missing
                .filter((item) => item.origin === "profile")
                .map((item) => profileLabels[item.key] || item.key)
                .join(", ")}
              .
            </p>
          )}
          {assessment.missing.some((item) => item.origin === "answer") && (
            <p>
              Answer the scheme questions, or leave Not sure for the provider to
              clarify.
            </p>
          )}
          {assessment.missing.some((item) => item.origin === "official") && (
            <p>Ask the provider to verify the exact entry-age condition.</p>
          )}
        </div>
      )}
      <div className="assessment-actions">
        {assessment.missing.some((item) => item.origin === "answer") && (
          <Button variant="secondary" onClick={() => onQuestions(result.slug)}>
            Answer missing questions <ArrowRight size={14} aria-hidden="true" />
          </Button>
        )}
        {assessment.missing.some((item) => item.origin === "profile") && (
          <Button variant="ghost" to="/profile">
            Review profile
          </Button>
        )}
        <Button to={`/schemes/${result.slug}`} variant="ghost">
          Scheme details <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
        <Button to={`/readiness?scheme=${result.slug}`} variant="ghost">
          Prepare checklist <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>
      {assessment.ruleVersion && (
        <small className="assessment-version">
          Rule review {assessment.reviewedAt} · {assessment.ruleVersion}
        </small>
      )}
    </article>
  );
}
