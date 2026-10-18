import { useLanguage } from "../i18n/useLanguage";
import Button from "../components/Button";
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main id="main-content" tabIndex={-1} className="not-found page-enter">
      <span className="eyebrow">{t("404 \xB7 A SMALL DETOUR")}</span>
      <h1>{t("This path doesn\u2019t lead anywhere.")}</h1>
      <p>{t("Let\u2019s get you back to a clearer starting point.")}</p>
      <Button to="/">{t("Back to home")}</Button>
    </main>
  );
}
