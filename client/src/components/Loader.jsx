import { useLanguage } from "../i18n/useLanguage";
import { LoaderCircle } from "lucide-react";
export default function Loader() {
  const { t } = useLanguage();
  return (
    <div className="auth-loader" role="status">
      <LoaderCircle size={30} className="spin" />
      <span>{t("Getting your space ready")}</span>
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}
