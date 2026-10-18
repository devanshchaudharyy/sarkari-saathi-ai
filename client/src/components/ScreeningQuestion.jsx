import { useLanguage } from "../i18n/useLanguage";
import SelectField from "./SelectField";
export default function ScreeningQuestion({ question, answers, onChange }) {
  const { t } = useLanguage();
  const value = answers[question.key] ?? null;
  const stage = question.key === "upStageRequirementsMet" && answers.upStage;
  const id = `screen-${question.key}`;
  if (question.type === "stage")
    return (
      <div className="screening-stage">
        <SelectField
          id={id}
          label={t(question.label)}
          value={value || ""}
          options={question.options}
          placeholder={t("Not selected / not sure")}
          onChange={(event) =>
            onChange(question.key, event.target.value || null)
          }
          helper={t(question.helper)}
        />
        <a href={question.source.url} target="_blank" rel="noopener noreferrer">
          {t("Official stage requirements \u2197")}
        </a>
      </div>
    );
  return (
    <fieldset className="screening-question" aria-describedby={`${id}-helper`}>
      <legend>{t(question.label)}</legend>
      <p id={`${id}-helper`}>{t(question.helper)}</p>
      {stage && (
        <p className="screening-stage-context">
          {t(
            "Read the selected stage\u2019s requirement above before answering.",
          )}
        </p>
      )}
      <div className="screening-choices">
        {[
          {
            value: true,
            label: "Yes",
          },
          {
            value: false,
            label: "No",
          },
          {
            value: null,
            label: "Not sure",
          },
        ].map((option) => (
          <label
            key={String(option.value)}
            className={value === option.value ? "chosen" : ""}
          >
            <input
              type="radio"
              name={question.key}
              value={String(option.value)}
              checked={value === option.value}
              onChange={() => onChange(question.key, option.value)}
            />
            <span>{t(option.label)}</span>
          </label>
        ))}
      </div>
      <a
        href={question.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="question-source"
      >
        {t("Read the official requirement \u2197")}
      </a>
    </fieldset>
  );
}
