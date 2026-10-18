import { useLanguage } from "../i18n/useLanguage";
export default function TranslationNotice() {
  const { language, t } = useLanguage();
  if (language !== "hi") return null;
  return (
    <p
      className="translation-notice"
      role="note"
      aria-label={t("Translation guidance")}
    >
      {t(
        "Hindi is a project translation, not an official government translation. Verify current terms at the official source.",
      )}
    </p>
  );
}
