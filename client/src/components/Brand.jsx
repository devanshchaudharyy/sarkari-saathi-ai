import { useLanguage } from "../i18n/useLanguage";
import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
export default function Brand() {
  const { t } = useLanguage();
  return (
    <Link className="brand" to="/" title={t("SarkariSaathi AI home")}>
      <span className="brand-mark">
        <Landmark size={23} />
      </span>
      <span>
        {t("Sarkari")}
        <span className="brand-light">{t("Saathi")}</span>
        <small>{t("AI")}</small>
      </span>
    </Link>
  );
}
