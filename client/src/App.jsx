import { useLanguage } from "./i18n/useLanguage";
import { useEffect, lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkspaceLayout from "./layouts/WorkspaceLayout";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Loader from "./components/Loader";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Schemes = lazy(() => import("./pages/Schemes"));
const SchemeDetail = lazy(() => import("./pages/SchemeDetail"));
const Eligibility = lazy(() => import("./pages/Eligibility"));
const Readiness = lazy(() => import("./pages/Readiness"));
const Discovery = lazy(() => import("./pages/Discovery"));
import NotFound from "./pages/NotFound";
function NavigationEffects() {
  const { t, language } = useLanguage();
  const location = useLocation();
  useEffect(() => {
    const titles = {
      "/": "Government Schemes Made Understandable",
      "/login": "Log in",
      "/register": "Create your account",
      "/dashboard": "Your dashboard",
      "/profile": "Your profile",
      "/schemes": "Browse government schemes",
      "/eligibility": "Eligibility screening",
      "/readiness": "Your application preparation",
      "/discover": "Your scheme shortlist",
    };
    document.title = `SarkariSaathi AI — ${t(titles[location.pathname] || (location.pathname.startsWith("/schemes/") ? "Scheme details" : "Page not found"))}`;
    const description = document.querySelector('meta[name="description"]');
    if (description)
      description.content = t(
        "Discover government schemes that may match your profile and understand them in simple language.",
      );
  }, [location.pathname, language]);
  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => {
        const element = document.getElementById(location.hash.slice(1));
        element?.scrollIntoView();
        element?.focus({
          preventScroll: true,
        });
      });
    } else
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
  }, [location.pathname, location.hash]);
  return null;
}
export default function App() {
  const { t } = useLanguage();
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
      </a>
      <NavigationEffects />
      <Suspense fallback={<Loader />}>
        <Outlet />
      </Suspense>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4500}
        containerAriaLabel={t("Notifications")}
        toastOptions={{ closeButtonAriaLabel: t("Close notification") }}
      />
    </>
  );
}
function RouteError() {
  const { t } = useLanguage();
  return (
    <main className="session-error">
      <h1>{t("Something interrupted your visit.")}</h1>
      <p>{t("Please reload the page or return to the home page.")}</p>
      <a className="button button-primary" href="/">
        {t("Return home")}
      </a>
    </main>
  );
}
export const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    ),
    errorElement: <RouteError />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/",
            element: <Home />,
          },
          {
            path: "/schemes",
            element: <Schemes />,
          },
          {
            path: "/schemes/:slug",
            element: <SchemeDetail />,
          },
          {
            path: "*",
            element: <NotFound />,
          },
        ],
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <WorkspaceLayout />,
            children: [
              { path: "/discover", element: <Discovery /> },
              {
                path: "/dashboard",
                element: <Dashboard />,
              },
              {
                path: "/profile",
                element: <Profile />,
              },
              {
                path: "/eligibility",
                element: <Eligibility />,
              },
              {
                path: "/readiness",
                element: <Readiness />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
