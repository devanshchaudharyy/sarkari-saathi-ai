import { useLanguage } from "../i18n/useLanguage";
export default function SelectField({
  id,
  label,
  error,
  helper,
  options,
  placeholder = "Select an option",
  ...props
}) {
  const { t } = useLanguage();
  return (
    <div className="field">
      <label htmlFor={id}>{t(label)}</label>
      <div className="input-wrap">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : helper ? `${id}-helper` : undefined
          }
          {...props}
        >
          <option value="">{t(placeholder)}</option>
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
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
