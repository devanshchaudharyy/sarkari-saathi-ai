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
  return (
    <div
      className="preview-scene"
      aria-label="Conceptual preview of planned features"
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="preview-card">
        <div className="preview-top">
          <span className="mini-brand">
            <Landmark size={18} /> Your opportunity space
          </span>
          <span className="preview-label">CONCEPT PREVIEW</span>
        </div>
        <div className="preview-body">
          <div className="preview-greeting">A clearer path forward</div>
          <h2>
            Smart scheme discovery<span>Built around you.</span>
          </h2>
          <div className="preview-search">
            <Search size={17} />
            <span>Opportunities that fit your life</span>
          </div>
          <div className="preview-item">
            <span className="icon-box indigo">
              <UserRound size={20} />
            </span>
            <div>
              <strong>Profile Match</strong>
              <small>Your circumstances. Your possibilities.</small>
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
              <strong>Eligibility Insights</strong>
              <small>Complex requirements, made clear.</small>
            </div>
            <ChevronRight size={17} />
          </div>
          <div className="preview-item">
            <span className="icon-box green">
              <FileCheck2 size={20} />
            </span>
            <div>
              <strong>Application Readiness</strong>
              <small>Know your next step.</small>
            </div>
            <ChevronRight size={17} />
          </div>
          <div className="preview-ai">
            <Sparkles size={19} />
            <div>
              <strong>A little assistance. A lot more clarity.</strong>
              <small>Source-grounded AI assistance · planned</small>
            </div>
          </div>
        </div>
        <div className="preview-bottom">
          <LockKeyhole size={12} /> Conceptual interface · features coming in
          future phases
        </div>
      </div>
      <div className="floating-note">
        <span className="icon-box green">
          <ShieldCheck size={22} />
        </span>
        <div>
          <strong>Clarity you can trace.</strong>
          <span>Official-source grounding, by design.</span>
        </div>
      </div>
      <div className="scene-caption">
        <span /> A thoughtful foundation. An ambitious future.
      </div>
    </div>
  );
}
export default function Home() {
  useReveal();
  const { user } = useAuth();
  const destination = user ? "/dashboard" : "/register";
  return (
    <main id="main-content" tabIndex={-1} className="page-enter">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow-pill">
              <span className="status-dot" /> PUBLIC BENEFITS. PERSONAL CLARITY.
            </div>
            <h1>
              Government benefits,
              <br />
              <span>made understandable.</span>
            </h1>
            <p className="hero-description">
              Discover government schemes that may match your profile and
              understand them in simple language.
            </p>
            <div className="hero-actions">
              <Button to={destination}>
                Find My Schemes <ArrowRight size={18} />
              </Button>
              <Button href="#how-it-works" variant="secondary">
                Learn More <ArrowUpRight size={17} />
              </Button>
            </div>
            <p className="hero-footnote">
              <ShieldCheck size={16} /> Your journey starts with a simple
              account.
            </p>
            <div className="phase-note">
              <span>PHASE 05</span> Save schemes and prepare at your pace.
              Official verification still applies.
            </div>
          </div>
          <Preview />
        </div>
      </section>
      <div className="principles-strip">
        <div className="container principles-inner">
          <span>DESIGNED WITH PURPOSE</span>
          <p>
            <Check size={16} /> Simple language
          </p>
          <p>
            <Check size={16} /> Privacy in mind
          </p>
          <p>
            <Check size={16} /> Transparent by design
          </p>
          <p>
            <Check size={16} /> Made for India
          </p>
        </div>
      </div>
      <section id="why" tabIndex={-1} className="section container">
        <div className="section-heading" data-reveal>
          <span className="eyebrow">LESS COMPLEXITY. MORE POSSIBILITY.</span>
          <h2>
            Opportunities shouldn’t
            <br />
            get lost in the paperwork.
          </h2>
          <p>
            Finding support can feel complicated. We’re building a simpler way
            to go from “Where do I start?” to “I understand my next step.”
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text, color }, i) => (
            <article
              className="feature-card"
              data-reveal
              style={{ "--delay": `${i * 65}ms` }}
              key={title}
            >
              <span className={`icon-box ${color}`}>
                <Icon size={23} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="feature-status">
                {i !== 2 ? "Available now" : "Planned capability"}{" "}
                <ArrowUpRight size={14} />
              </span>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" tabIndex={-1} className="process-section">
        <div className="container">
          <div className="section-heading centered" data-reveal>
            <span className="eyebrow">A SIMPLE PATH FORWARD</span>
            <h2>From possibilities to a plan.</h2>
            <p>
              Here’s how the platform will work as we grow.
              <br />
              Today, browse schemes, save your profile and screen basic
              criteria.
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
                style={{ "--delay": `${i * 65}ms` }}
              >
                <div className="step-number">0{i + 1}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="benefits-section container" data-reveal>
        <div>
          <span className="eyebrow">BUILT FOR REAL LIFE</span>
          <h2>
            Less searching.
            <br />
            More understanding.
          </h2>
          <p>
            A thoughtful companion for navigating public benefits, wherever you
            are in your journey.
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
                <h3>{title}</h3>
                <p>{text}</p>
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
          <span className="eyebrow">TRUST IS THE STARTING POINT</span>
          <h2>Built with privacy in mind.</h2>
          <p>
            Create an account with your name, email, and password. You choose
            which profile details to save. Future recommendations aim to be
            transparent and grounded in official sources.
          </p>
          <div className="trust-tags">
            <span>
              <LockKeyhole size={14} /> Minimal data collection
            </span>
            <span>
              <BookOpen size={14} /> Traceable information
            </span>
          </div>
        </div>
        <div className="trust-aside">
          Your information.
          <br />A thoughtful approach.
          <small>Privacy starts with the basics.</small>
        </div>
      </section>
      <section className="cta-section container" data-reveal>
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>
            A little clarity can
            <br />
            open new possibilities.
          </h2>
          <p>Create your account. Be ready for what comes next.</p>
        </div>
        <Button to={destination}>
          Get started with SarkariSaathi <ArrowRight size={18} />
        </Button>
        <div className="cta-decoration" aria-hidden="true" />
      </section>
    </main>
  );
}
