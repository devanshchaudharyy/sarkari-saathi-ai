import SelectField from "./SelectField";
export default function ScreeningQuestion({ question, answers, onChange }) {
  const value = answers[question.key] ?? null;
  const stage = question.key === "upStageRequirementsMet" && answers.upStage;
  const id = `screen-${question.key}`;
  if (question.type === "stage")
    return (
      <div className="screening-stage">
        <SelectField
          id={id}
          label={question.label}
          value={value || ""}
          options={question.options}
          placeholder="Not selected / not sure"
          onChange={(event) =>
            onChange(question.key, event.target.value || null)
          }
          helper={question.helper}
        />
        <a href={question.source.url} target="_blank" rel="noopener noreferrer">
          Official stage requirements ↗
        </a>
      </div>
    );
  return (
    <fieldset className="screening-question" aria-describedby={`${id}-helper`}>
      <legend>{question.label}</legend>
      <p id={`${id}-helper`}>{question.helper}</p>
      {stage && (
        <p className="screening-stage-context">
          Read the selected stage’s requirement above before answering.
        </p>
      )}
      <div className="screening-choices">
        {[
          { value: true, label: "Yes" },
          { value: false, label: "No" },
          { value: null, label: "Not sure" },
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
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <a
        href={question.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="question-source"
      >
        Read the official requirement ↗
      </a>
    </fieldset>
  );
}
