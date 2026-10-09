import Brand from "./Brand";
export default function Footer() {
  return (
    <footer className="footer container">
      <div className="footer-main">
        <div>
          <Brand />
          <p>A little clarity. A world of possibility.</p>
        </div>
        <div className="footer-links">
          <a href="/#why">The platform</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/#trust">Privacy approach</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SarkariSaathi AI</span>
        <span>Independent project. Not an official government service.</span>
        <span>
          Made for a more informed India <i className="india-dot" />
        </span>
      </div>
    </footer>
  );
}
