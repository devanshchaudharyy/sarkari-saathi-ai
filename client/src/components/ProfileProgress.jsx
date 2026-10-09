import { Check, Clock3 } from "lucide-react";
import { CORE_FIELDS } from "../../../shared/profile.js";
export default function ProfileProgress({
  completion,
  label = "Saved profile completion",
  checklist = false,
}) {
  return (
    <div className="profile-progress">
      <div className="progress-heading">
        <span>{label}</span>
        <strong>{completion.percentage}%</strong>
      </div>
      <progress max="100" value={completion.percentage} aria-label={label} />
      <p>
        {completion.completedFields} of {completion.totalFields} core details
        added
      </p>
      {checklist ? (
        <ul className="completion-checklist">
          {CORE_FIELDS.map(({ key, label }) => {
            const done = !completion.missingFields.includes(key);
            return (
              <li key={key} className={done ? "complete" : ""}>
                {done ? <Check size={16} /> : <Clock3 size={16} />}
                <span>{label}</span>
                <small>{done ? "Added" : "Not added"}</small>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
