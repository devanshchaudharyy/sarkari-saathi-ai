import { useLanguage } from "../i18n/useLanguage";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Brand from "./Brand";
import LanguageSwitcher from "./LanguageSwitcher";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
export default function Navbar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const location = useLocation(),
    { user } = useAuth();
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 12);
    scroll();
    window.addEventListener("scroll", scroll, {
      passive: true,
    });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <Brand />
        <LanguageSwitcher />
        <button
          id="menu-toggle"
          className="menu-toggle"
          aria-label={t(open ? "Close navigation" : "Open navigation")}
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-navigation"
          className={`nav-links ${open ? "open" : ""}`}
          aria-label={t("Main navigation")}
        >
          <a href="/#why" onClick={() => setOpen(false)}>
            {t("Why SarkariSaathi")}
          </a>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>
            {t("How it works")}
          </a>
          <Link to="/schemes" onClick={() => setOpen(false)}>
            {t("Browse schemes")}
          </Link>
          <div className="nav-actions">
            {user ? (
              <Button to="/dashboard">
                {t("My dashboard ")}
                <ArrowUpRight size={16} />
              </Button>
            ) : (
              <>
                <Button to="/login" variant="ghost">
                  {t("Log in")}
                </Button>
                <Button to="/register">
                  {t("Get started ")}
                  <ArrowUpRight size={16} />
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
