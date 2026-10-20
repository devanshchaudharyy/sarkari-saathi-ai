import { useLanguage } from "../i18n/useLanguage";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  LogOut,
  Compass,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  ListChecks,
} from "lucide-react";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";
import TranslationNotice from "../components/TranslationNotice";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
export default function WorkspaceLayout() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  return (
    <div className="dashboard page-enter">
      <aside className="dashboard-sidebar workspace-sidebar">
        <Brand />
        <span className="sidebar-label">{t("YOUR WORKSPACE")}</span>
        <nav
          className="workspace-navigation"
          aria-label={t("Workspace navigation")}
        >
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <LayoutDashboard size={19} />
            {t(" Overview")}
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <UserRound size={19} />
            {t(" My profile")}
          </NavLink>
          <NavLink to="/schemes" className="sidebar-link">
            <Compass size={19} />
            {t(" Schemes")}
          </NavLink>
          <NavLink
            to="/discover"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <Compass size={19} />
            {t("My shortlist")}
          </NavLink>
          <NavLink
            to="/eligibility"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <ListChecks size={19} />
            {t(" Screening")}
          </NavLink>
          <NavLink
            to="/readiness"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <FileCheck2 size={19} />
            {t("Preparation")}
          </NavLink>
        </nav>
        <div className="sidebar-future">
          <span>{t("ON THE HORIZON")}</span>
          {[[Sparkles, "AI Assistant"]].map(([Icon, title]) => (
            <div key={title}>
              <Icon size={18} />
              {t(title)}
              <small>{t("Later")}</small>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-trust">
            <ShieldCheck size={22} />
            <strong>{t("Your space. Your details.")}</strong>
            <p>{t("Only your signed-in account can access your profile.")}</p>
          </div>
          <Button variant="ghost" onClick={logout}>
            <LogOut size={17} />
            {t(" Sign out")}
          </Button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="dashboard-main">
        <header className="dashboard-top">
          <span>
            {t("Workspace")}{" "}
            <span className="breadcrumb">
              /{" "}
              {t(
                location.pathname === "/profile"
                  ? "My profile"
                  : location.pathname === "/eligibility"
                    ? "Screening"
                    : location.pathname === "/discover"
                      ? "My shortlist"
                      : location.pathname === "/readiness"
                        ? "Preparation"
                        : "Overview",
              )}
            </span>
          </span>
          <div className="dashboard-user">
            <LanguageSwitcher />
            <span className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span>{user.name}</span>
            <button
              className="mobile-logout"
              onClick={logout}
              aria-label={t("Sign out")}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <div className="dashboard-content">
          <Outlet />
          <TranslationNotice />
          <footer className="dashboard-footer">
            {t("Independent project. Not an official government service.")}
            <span>{t("SarkariSaathi AI · Phase 08")}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
