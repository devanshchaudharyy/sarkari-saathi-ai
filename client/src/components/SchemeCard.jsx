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
  const Icon = schemeIcons[scheme.category] || BookOpen;
  return (
    <article className={`scheme-card scheme-${scheme.category}`}>
      <div className="scheme-card-top">
        <span className="scheme-icon">
          <Icon size={24} aria-hidden="true" />
        </span>
        <span className="badge">
          {scheme.level === "central" ? "Central scheme" : "State scheme"}
        </span>
      </div>
      <span className="scheme-category">
        {categoryLabel(scheme.category)} · {scheme.acronym}
      </span>
      <h2>{scheme.name}</h2>
      <p className="scheme-summary">{scheme.summary}</p>
      <div className="scheme-benefit">
        <strong>{scheme.benefitLabel}</strong>
        <span>{scheme.benefitNote}</span>
      </div>
      <div className="scheme-geography">
        <MapPin size={14} aria-hidden="true" />{" "}
        {scheme.level === "central" ? "Across India" : scheme.states.join(", ")}
      </div>
      <div className="scheme-card-footer">
        <small>Reviewed {formatReviewDate(scheme.reviewedAt)}</small>
        <Link
          to={`/schemes/${scheme.slug}${search}`}
          aria-label={`View details: ${scheme.name}`}
        >
          View details <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
