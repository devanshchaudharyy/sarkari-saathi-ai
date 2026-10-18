import { useLanguage } from "../i18n/useLanguage";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  UserRound,
  BookOpen,
  LockKeyhole,
  MessageSquareText,
  Search,
  Landmark,
} from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import useReveal from "../hooks/useReveal";
const features = [
  {
    icon: Compass,
    title: "Discover relevant schemes",
    text: "A clearer starting point for benefits that may match your circumstances.",
    color: "indigo",
  },
  {
    icon: BookOpen,
    title: "Understand eligibility",
    text: "Know what the requirements mean, without getting lost in the fine print.",
    color: "orange",
  },
  {
    icon: MessageSquareText,
    title: "AI assistance",
    text: "Planned simple-language answers, grounded in official source documents.",
    color: "green",
  },
  {
    icon: FileCheck2,
    title: "Application readiness",
    text: "Save schemes and track preparation tasks with official references behind each checklist.",
    color: "purple",
  },
];
function Preview() {
  const { t } = useLanguage();
  return (
    <div
      className="preview-scene"
      aria-label={t("Conceptual preview of planned features")}
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="preview-card">
        <div className="preview-top">
          <span className="mini-brand">
            <Landmark size={18} />
            {t(" Your opportunity space")}
          </span>
          <span className="preview-label">{t("CONCEPT PREVIEW")}</span>
        </div>
        <div className="preview-body">
          <div className="preview-greeting">{t("A clearer path forward")}</div>
          <h2>
            {t("Smart scheme discovery")}
            <span>{t("Built around you.")}</span>
          </h2>
          <div className="preview-search">
            <Search size={17} />
            <span>{t("Opportunities that fit your life")}</span>
          </div>
          <div className="preview-item">
            <span className="icon-box indigo">
              <UserRound size={20} />
            </span>
            <div>
              <strong>{t("Profile Match")}</strong>
              <small>{t("Your circumstances. Your possibilities.")}</small>
            </div>
            <span className="preview-check">
              <Check size={15} />
            </span>
          </div>
          <div className="preview-item">
            <span className="icon-box orange">
              <BookOpen size={20} />
            </span>
            <div>
              <strong>{t("Eligibility Insights")}</strong>
              <small>{t("Complex requirements, made clear.")}</small>
            </div>
            <ChevronRight size={17} />
          </div>
          <div className="preview-item">
            <span className="icon-box green">
              <FileCheck2 size={20} />
            </span>
            <div>
              <strong>{t("Application Readiness")}</strong>
              <small>{t("Know your next step.")}</small>
            </div>
            <ChevronRight size={17} />
          </div>
          <div className="preview-ai">
            <Sparkles size={19} />
            <div>
              <strong>{t("A little assistance. A lot more clarity.")}</strong>
              <small>{t("Source-grounded AI assistance \xB7 planned")}</small>
            </div>
          </div>
        </div>
        <div className="preview-bottom">
          <LockKeyhole size={12} />
          {t(" Conceptual interface \xB7 features coming in future phases")}
        </div>
      </div>
      <div className="floating-note">
        <span className="icon-box green">
          <ShieldCheck size={22} />
        </span>
        <div>
          <strong>{t("Clarity you can trace.")}</strong>
          <span>{t("Official-source grounding, by design.")}</span>
        </div>
      </div>
      <div className="scene-caption">
        <span />
        {t(" A thoughtful foundation. An ambitious future.")}
      </div>
    </div>
  );
}
export default function Home() {
  const { t } = useLanguage();
  useReveal();
  const { user } = useAuth();
  const destination = user ? "/dashboard" : "/register";
  return (
    <main id="main-content" tabIndex={-1} className="page-enter">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow-pill">
              <span className="status-dot" />
              {t(" PUBLIC BENEFITS. PERSONAL CLARITY.")}
            </div>
            <h1>
              {t("Government benefits,")}
              <br />
              <span>{t("made understandable.")}</span>
            </h1>
            <p className="hero-description">
              {t(
                "Discover government schemes that may match your profile and understand them in simple language.",
              )}
            </p>
            <div className="hero-actions">
              <Button to={destination}>
                {t("Find My Schemes ")}
                <ArrowRight size={18} />
              </Button>
              <Button href="#how-it-works" variant="secondary">
                {t("Learn More ")}
                <ArrowUpRight size={17} />
              </Button>
            </div>
            <p className="hero-footnote">
              <ShieldCheck size={16} />
              {t(" Your journey starts with a simple account.")}
            </p>
            <div className="phase-note">
              <span>{t("PHASE 06")}</span>
              {t(
                " Save schemes and prepare at your pace. Official verification still applies.",
              )}
            </div>
          </div>
          <Preview />
        </div>
      </section>
      <div className="principles-strip">
        <div className="container principles-inner">
          <span>{t("DESIGNED WITH PURPOSE")}</span>
          <p>
            <Check size={16} />
            {t(" Simple language")}
          </p>
          <p>
            <Check size={16} />
            {t(" Privacy in mind")}
          </p>
          <p>
            <Check size={16} />
            {t(" Transparent by design")}
          </p>
          <p>
            <Check size={16} />
            {t(" Made for India")}
          </p>
        </div>
      </div>
      <section id="why" tabIndex={-1} className="section container">
        <div className="section-heading" data-reveal>
          <span className="eyebrow">
            {t("LESS COMPLEXITY. MORE POSSIBILITY.")}
          </span>
          <h2>
            {t("Opportunities shouldn\u2019t")}
            <br />
            {t("get lost in the paperwork.")}
          </h2>
          <p>
            {t(
              "Finding support can feel complicated. We\u2019re building a simpler way to go from \u201CWhere do I start?\u201D to \u201CI understand my next step.\u201D",
            )}
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text, color }, i) => (
            <article
              className="feature-card"
              data-reveal
              style={{
                "--delay": `${i * 65}ms`,
              }}
              key={title}
            >
              <span className={`icon-box ${color}`}>
                <Icon size={23} />
              </span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
              <span className="feature-status">
                {t(i !== 2 ? "Available now" : "Planned capability")}{" "}
                <ArrowUpRight size={14} />
              </span>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" tabIndex={-1} className="process-section">
        <div className="container">
          <div className="section-heading centered" data-reveal>
            <span className="eyebrow">{t("A SIMPLE PATH FORWARD")}</span>
            <h2>{t("From possibilities to a plan.")}</h2>
            <p>
              {t("Here\u2019s how the platform will work as we grow.")}
              <br />
              {t(
                "Today, browse schemes, save your profile and screen basic criteria.",
              )}
            </p>
          </div>
          <div className="steps">
            {[
              [
                "Create your profile",
                "Create an account and save your basic details, at your own pace.",
              ],
              [
                "Discover schemes",
                "Search a small catalog and read summaries linked to official sources.",
              ],
              [
                "Understand eligibility",
                "Screen checked criteria, see reasons and fill missing information.",
              ],
              [
                "Prepare your application",
                "Understand the documents and next steps you may need.",
              ],
            ].map(([title, text], i) => (
              <article
                className="step"
                key={title}
                data-reveal
                style={{
                  "--delay": `${i * 65}ms`,
                }}
              >
                <div className="step-number">0{t(i + 1)}</div>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="benefits-section container" data-reveal>
        <div>
          <span className="eyebrow">{t("BUILT FOR REAL LIFE")}</span>
          <h2>
            {t("Less searching.")}
            <br />
            {t("More understanding.")}
          </h2>
          <p>
            {t(
              "A thoughtful companion for navigating public benefits, wherever you are in your journey.",
            )}
          </p>
        </div>
        <div className="benefit-list">
          {[
            [
              "Clarity before decisions",
              "Understand the information before deciding what to do next.",
            ],
            [
              "One calm, connected space",
              "A future home for discovery, guidance, and preparation.",
            ],
            [
              "Designed to meet you where you are",
              "Accessible, responsive, and easy to use on your phone.",
            ],
          ].map(([title, text]) => (
            <div key={title}>
              <span className="benefit-check">
                <Check size={18} />
              </span>
              <div>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section
        id="trust"
        tabIndex={-1}
        className="trust-section container"
        data-reveal
      >
        <div className="trust-symbol">
          <ShieldCheck size={40} />
        </div>
        <div className="trust-copy">
          <span className="eyebrow">{t("TRUST IS THE STARTING POINT")}</span>
          <h2>{t("Built with privacy in mind.")}</h2>
          <p>
            {t(
              "Create an account with your name, email, and password. You choose which profile details to save. Future recommendations aim to be transparent and grounded in official sources.",
            )}
          </p>
          <div className="trust-tags">
            <span>
              <LockKeyhole size={14} />
              {t(" Minimal data collection")}
            </span>
            <span>
              <BookOpen size={14} />
              {t(" Traceable information")}
            </span>
          </div>
        </div>
        <div className="trust-aside">
          {t("Your information.")}
          <br />
          {t("A thoughtful approach.")}
          <small>{t("Privacy starts with the basics.")}</small>
        </div>
      </section>
      <section className="cta-section container" data-reveal>
        <div>
          <span className="eyebrow">{t("YOUR NEXT CHAPTER STARTS HERE")}</span>
          <h2>
            {t("A little clarity can")}
            <br />
            {t("open new possibilities.")}
          </h2>
          <p>{t("Create your account. Be ready for what comes next.")}</p>
        </div>
        <Button to={destination}>
          {t("Get started with SarkariSaathi ")}
          <ArrowRight size={18} />
        </Button>
        <div className="cta-decoration" aria-hidden="true" />
      </section>
    </main>
  );
}
