import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLanguage } from "../i18n/useLanguage";
export default function LanguageSwitcher() {
  const { language, setLanguage, t, pending, languageError } = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef(null),
    trigger = useRef(null),
    options = useRef([]);
  useEffect(() => {
    if (!open) return;
    options.current[language === "hi" ? 1 : 0]?.focus();
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);
  async function choose(value) {
    await setLanguage(value);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="language-switcher"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          if (!open) {
            setOpen(true);
            return;
          }
          const current = options.current.indexOf(document.activeElement);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? 1
                : (current + (event.key === "ArrowUp" ? -1 : 1) + 2) % 2;
          options.current[next]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="language-trigger"
        aria-label={`${t("Choose language")}: ${language === "hi" ? "हिन्दी" : "English"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={pending}
        disabled={pending}
        onClick={() => setOpen(!open)}
      >
        <Languages size={17} aria-hidden="true" />
        <span lang={language}>{language === "hi" ? "हिन्दी" : "English"}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {languageError && (
        <span role="alert" className="language-load-error">
          {languageError}
        </span>
      )}
      {open && (
        <div
          className="language-menu"
          role="menu"
          aria-label={t("Choose language")}
        >
          {[
            {
              value: "en",
              native: "English",
              detail: "English",
            },
            {
              value: "hi",
              native: "हिन्दी",
              detail: "Hindi",
            },
          ].map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                options.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={language === option.value}
              onClick={() => choose(option.value)}
            >
              <span>
                <strong lang={option.value}>{option.native}</strong>
                <small>{t(option.detail)}</small>
              </span>
              {language === option.value && (
                <Check size={16} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
