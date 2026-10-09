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
  const { user } = useAuth();
  const resource = useProfile();
  const completion = resource.data?.completion;
  return (
    <div className="page-enter">
      <span className="eyebrow">A LITTLE CLARITY STARTS HERE</span>
      <h1>
        Welcome back, {user.name.split(" ")[0]}
        <span className="welcome-dot">.</span>
      </h1>
      <p className="dashboard-subtitle">
        Your space is ready. Add a few basics, at your own pace.
      </p>
      <div className="account-banner">
        <span className="account-check">
          <Check size={23} />
        </span>
        <div>
          <h2>Your next step is personal.</h2>
          <p>
            Keep your profile up to date, or explore the scheme library at your
            own pace.
          </p>
        </div>
        <span className="badge green">Account active</span>
      </div>
      <div className="dashboard-section-title">
        <h2>Your opportunity toolkit</h2>
        <span>Growing one phase at a time</span>
      </div>
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-profile-card">
          <div className="dashboard-card-top">
            <span className="icon-box indigo">
              <UserRound size={25} />
            </span>
            <span className={`badge ${completion?.isComplete ? "green" : ""}`}>
              {completion?.isComplete ? "Profile complete" : "Available now"}
            </span>
          </div>
          <h3>Profile Setup</h3>
          <p>
            Keep your basic details in one place. Save a draft, finish it later,
            or update it anytime.
          </p>
          {resource.loading ? (
            <div className="profile-card-loading" role="status">
              <LoaderCircle size={17} className="spin" /> Retrieving your
              profile
            </div>
          ) : resource.error ? (
            <div className="profile-card-error" role="alert">
              <p>{resource.error}</p>
              <Button variant="ghost" onClick={resource.retry}>
                Try again
              </Button>
            </div>
          ) : (
            <ProfileProgress completion={completion} />
          )}
          <Button to="/profile" className="profile-card-action">
            {completion?.isComplete
              ? "Edit profile"
              : completion?.completedFields
                ? "Continue profile"
                : "Set up profile"}
            <ArrowRight size={16} />
          </Button>
        </article>
        {modules.map(({ icon: Icon, title, text, status, color }) => (
          <article className="dashboard-card" key={title}>
            <div className="dashboard-card-top">
              <span className={`icon-box ${color}`}>
                <Icon size={25} />
              </span>
              <span className="badge">{status}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            {title === "Scheme Discovery" ||
            title === "Application Readiness" ? (
              <Button
                to={title === "Scheme Discovery" ? "/schemes" : "/readiness"}
                className="profile-card-action"
              >
                {title === "Scheme Discovery"
                  ? "Browse schemes"
                  : "Open preparation"}{" "}
                <ArrowRight size={16} />
              </Button>
            ) : (
              <div className="card-bottom">
                <span className="small-dot" /> In development
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="dashboard-note">
        <Landmark size={25} />
        <div>
          <h3>Clarity, with a source behind it.</h3>
          <p>
            Use your saved profile and a few extra answers to screen basic
            requirements. Review the reasons and missing information, with
            official sources behind each rule. Provider approval still applies.
          </p>
        </div>
        <Button to="/eligibility" variant="secondary">
          Screen basic criteria <ArrowUpRight size={16} />
        </Button>
      </div>
    </div>
  );
}
