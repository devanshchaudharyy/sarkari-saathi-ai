export default function SelectField({
  id,
  label,
  error,
  helper,
  options,
  placeholder = "Select an option",
  ...props
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : helper ? `${id}-helper` : undefined
          }
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="field-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
