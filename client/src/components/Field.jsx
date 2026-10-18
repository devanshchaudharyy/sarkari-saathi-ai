import { useLanguage } from "../i18n/useLanguage";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function Field({
  label,
  error,
  helper,
  type = "text",
  id,
  ...props
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{t(label)}</label>
      <div className="input-wrap">
        <input
          id={id}
          type={type === "password" && visible ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : helper ? `${id}-helper` : undefined
          }
          {...props}
        />
        {type === "password" ? (
          <button
            className="password-toggle"
            type="button"
            aria-label={t(visible ? "Hide password" : "Show password")}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {t(error)}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="field-helper">
          {t(helper)}
        </p>
      ) : null}
    </div>
  );
}
