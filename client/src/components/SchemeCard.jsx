import { useLanguage } from "../i18n/useLanguage";
import {
  ArrowUpRight,
  MapPin,
  Sprout,
  Shield,
  Wallet,
  Landmark,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { categoryLabel, formatReviewDate } from "../../../shared/schemes";
export const schemeIcons = {
  agriculture: Sprout,
  insurance: Shield,
  pension: Wallet,
  banking: Landmark,
  "women-education": GraduationCap,
};
export default function SchemeCard({ scheme, search = "" }) {
  const { t, locale } = useLanguage();
  const Icon = schemeIcons[scheme.category] || BookOpen;
  return (
    <article className={`scheme-card scheme-${scheme.category}`}>
      <div className="scheme-card-top">
        <span className="scheme-icon">
          <Icon size={24} aria-hidden="true" />
        </span>
        <span className="badge">
          {t(scheme.level === "central" ? "Central scheme" : "State scheme")}
        </span>
      </div>
      <span className="scheme-category">
        {t(categoryLabel(scheme.category))} · {t(scheme.acronym)}
      </span>
      <h2>{t(scheme.name)}</h2>
      <p className="scheme-summary">{t(scheme.summary)}</p>
      <div className="scheme-benefit">
        <strong>{t(scheme.benefitLabel)}</strong>
        <span>{t(scheme.benefitNote)}</span>
      </div>
      <div className="scheme-geography">
        <MapPin size={14} aria-hidden="true" />{" "}
        {t(
          scheme.level === "central"
            ? "Across India"
            : scheme.states.join(", "),
        )}
      </div>
      <div className="scheme-card-footer">
        <small>
          {t("Reviewed ")}
          {t(formatReviewDate(scheme.reviewedAt, locale))}
        </small>
        <Link
          to={`/schemes/${scheme.slug}${search}`}
          aria-label={t(`View details: ${scheme.name}`)}
        >
          {t("View details ")}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
