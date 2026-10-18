import { useLanguage } from "../i18n/useLanguage";
import Brand from "./Brand";
import TranslationNotice from "./TranslationNotice";
export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer container">
      <TranslationNotice />
      <div className="footer-main">
        <div>
          <Brand />
          <p>{t("A little clarity. A world of possibility.")}</p>
        </div>
        <div className="footer-links">
          <a href="/#why">{t("The platform")}</a>
          <a href="/#how-it-works">{t("How it works")}</a>
          <a href="/#trust">{t("Privacy approach")}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {t(new Date().getFullYear())}
          {t(" SarkariSaathi AI")}
        </span>
        <span>
          {t("Independent project. Not an official government service.")}
        </span>
        <span>
          {t("Made for a more informed India ")}
          <i className="india-dot" />
        </span>
      </div>
    </footer>
  );
}
