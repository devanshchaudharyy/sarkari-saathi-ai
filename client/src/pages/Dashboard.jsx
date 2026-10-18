import { useLanguage } from "../i18n/useLanguage";
import {
  ArrowRight,
  ArrowUpRight,
  UserRound,
  Compass,
  FileCheck2,
  Sparkles,
  Check,
  Landmark,
  LoaderCircle,
} from "lucide-react";
import Button from "../components/Button";
import ProfileProgress from "../components/ProfileProgress";
import useProfile from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";
const modules = [
  {
    icon: Compass,
    title: "Scheme Discovery",
    text: "Browse our small official-source catalog. Search, filter, and read the basics without a complete profile.",
    status: "Available now",
    color: "orange",
  },
  {
    icon: FileCheck2,
    title: "Application Readiness",
    text: "Save schemes, prepare documents and information, and keep checklist progress in your private workspace.",
    status: "Available now",
    color: "green",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    text: "Source-grounded AI assistance will be introduced in a later phase.",
    status: "Future phase",
    color: "purple",
  },
];
export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const resource = useProfile();
  const completion = resource.data?.completion;
  return (
    <div className="page-enter">
      <span className="eyebrow">{t("A LITTLE CLARITY STARTS HERE")}</span>
      <h1>
        {t("Welcome back, ")}
        {user.name.split(" ")[0]}
        <span className="welcome-dot">.</span>
      </h1>
      <p className="dashboard-subtitle">
        {t("Your space is ready. Add a few basics, at your own pace.")}
      </p>
      <div className="account-banner">
        <span className="account-check">
          <Check size={23} />
        </span>
        <div>
          <h2>{t("Your next step is personal.")}</h2>
          <p>
            {t(
              "Keep your profile up to date, or explore the scheme library at your own pace.",
            )}
          </p>
        </div>
        <span className="badge green">{t("Account active")}</span>
      </div>
      <div className="dashboard-section-title">
        <h2>{t("Your opportunity toolkit")}</h2>
        <span>{t("Growing one phase at a time")}</span>
      </div>
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-profile-card">
          <div className="dashboard-card-top">
            <span className="icon-box indigo">
              <UserRound size={25} />
            </span>
            <span className={`badge ${completion?.isComplete ? "green" : ""}`}>
              {t(completion?.isComplete ? "Profile complete" : "Available now")}
            </span>
          </div>
          <h3>{t("Profile Setup")}</h3>
          <p>
            {t(
              "Keep your basic details in one place. Save a draft, finish it later, or update it anytime.",
            )}
          </p>
          {resource.loading ? (
            <div className="profile-card-loading" role="status">
              <LoaderCircle size={17} className="spin" />
              {t(" Retrieving your profile")}
            </div>
          ) : resource.error ? (
            <div className="profile-card-error" role="alert">
              <p>{t(resource.error)}</p>
              <Button variant="ghost" onClick={resource.retry}>
                {t("Try again")}
              </Button>
            </div>
          ) : (
            <ProfileProgress completion={completion} />
          )}
          <Button to="/profile" className="profile-card-action">
            {t(
              completion?.isComplete
                ? "Edit profile"
                : completion?.completedFields
                  ? "Continue profile"
                  : "Set up profile",
            )}
            <ArrowRight size={16} />
          </Button>
        </article>
        {modules.map(({ icon: Icon, title, text, status, color }) => (
          <article className="dashboard-card" key={title}>
            <div className="dashboard-card-top">
              <span className={`icon-box ${color}`}>
                <Icon size={25} />
              </span>
              <span className="badge">{t(status)}</span>
            </div>
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
            {title === "Scheme Discovery" ||
            title === "Application Readiness" ? (
              <Button
                to={title === "Scheme Discovery" ? "/schemes" : "/readiness"}
                className="profile-card-action"
              >
                {t(
                  title === "Scheme Discovery"
                    ? "Browse schemes"
                    : "Open preparation",
                )}{" "}
                <ArrowRight size={16} />
              </Button>
            ) : (
              <div className="card-bottom">
                <span className="small-dot" />
                {t(" In development")}
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="dashboard-note">
        <Landmark size={25} />
        <div>
          <h3>{t("Clarity, with a source behind it.")}</h3>
          <p>
            {t(
              "Use your saved profile and a few extra answers to screen basic requirements. Review the reasons and missing information, with official sources behind each rule. Provider approval still applies.",
            )}
          </p>
        </div>
        <Button to="/eligibility" variant="secondary">
          {t("Screen basic criteria ")}
          <ArrowUpRight size={16} />
        </Button>
      </div>
    </div>
  );
}
