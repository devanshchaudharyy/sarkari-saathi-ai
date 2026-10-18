import { useLanguage } from "../i18n/useLanguage";
import { Check, Clock3 } from "lucide-react";
import { CORE_FIELDS } from "../../../shared/profile.js";
export default function ProfileProgress({
  completion,
  label = "Saved profile completion",
  checklist = false,
}) {
  const { t } = useLanguage();
  return (
    <div className="profile-progress">
      <div className="progress-heading">
        <span>{t(label)}</span>
        <strong>{t(completion.percentage)}%</strong>
      </div>
      <progress max="100" value={completion.percentage} aria-label={t(label)} />
      <p>
        {t("{0} of {1} core details added", [
          completion.completedFields,
          completion.totalFields,
        ])}
      </p>
      {checklist ? (
        <ul className="completion-checklist">
          {CORE_FIELDS.map(({ key, label }) => {
            const done = !completion.missingFields.includes(key);
            return (
              <li key={key} className={done ? "complete" : ""}>
                {done ? <Check size={16} /> : <Clock3 size={16} />}
                <span>{t(label)}</span>
                <small>{t(done ? "Added" : "Not added")}</small>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
