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
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  return (
    <div className="dashboard page-enter">
      <aside className="dashboard-sidebar workspace-sidebar">
        <Brand />
        <span className="sidebar-label">YOUR WORKSPACE</span>
        <nav className="workspace-navigation" aria-label="Workspace navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <LayoutDashboard size={19} /> Overview
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <UserRound size={19} /> My profile
          </NavLink>
          <NavLink to="/schemes" className="sidebar-link">
            <Compass size={19} /> Schemes
          </NavLink>
          <NavLink
            to="/eligibility"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <ListChecks size={19} /> Screening
          </NavLink>
          <NavLink
            to="/readiness"
            className={({ isActive }) =>
              isActive ? "sidebar-active" : "sidebar-link"
            }
          >
            <FileCheck2 size={19} />
            Preparation
          </NavLink>
        </nav>
        <div className="sidebar-future">
          <span>ON THE HORIZON</span>
          {[[Sparkles, "AI Assistant"]].map(([Icon, title]) => (
            <div key={title}>
              <Icon size={18} />
              {title}
              <small>Later</small>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-trust">
            <ShieldCheck size={22} />
            <strong>Your space. Your details.</strong>
            <p>Only your signed-in account can access your profile.</p>
          </div>
          <Button variant="ghost" onClick={logout}>
            <LogOut size={17} /> Sign out
          </Button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="dashboard-main">
        <header className="dashboard-top">
          <span>
            Workspace{" "}
            <span className="breadcrumb">
              /{" "}
              {location.pathname === "/profile"
                ? "My profile"
                : location.pathname === "/eligibility"
                  ? "Screening"
                  : location.pathname === "/readiness"
                    ? "Preparation"
                    : "Overview"}
            </span>
          </span>
          <div className="dashboard-user">
            <span className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span>{user.name}</span>
            <button
              className="mobile-logout"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <div className="dashboard-content">
          <Outlet />
          <footer className="dashboard-footer">
            Independent project. Not an official government service.
            <span>SarkariSaathi AI · Phase 05</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
