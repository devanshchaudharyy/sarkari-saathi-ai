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
import NotFound from "./pages/NotFound";
function NavigationEffects() {
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
    };
    document.title = `SarkariSaathi AI — ${titles[location.pathname] || (location.pathname.startsWith("/schemes/") ? "Scheme details" : "Page not found")}`;
    if (location.hash) {
      requestAnimationFrame(() => {
        const element = document.getElementById(location.hash.slice(1));
        element?.scrollIntoView();
        element?.focus({ preventScroll: true });
      });
    } else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
  return null;
}
export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <NavigationEffects />
      <Suspense fallback={<Loader />}>
        <Outlet />
      </Suspense>
      <Toaster position="bottom-right" richColors closeButton duration={4500} />
    </>
  );
}
export const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    ),
    errorElement: (
      <main className="session-error">
        <h1>Something interrupted your visit.</h1>
        <p>Please reload the page or return to the home page.</p>
        <a className="button button-primary" href="/">
          Return home
        </a>
      </main>
    ),
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/schemes", element: <Schemes /> },
          { path: "/schemes/:slug", element: <SchemeDetail /> },
          { path: "*", element: <NotFound /> },
        ],
      },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <WorkspaceLayout />,
            children: [
              { path: "/dashboard", element: <Dashboard /> },
              { path: "/profile", element: <Profile /> },
              { path: "/eligibility", element: <Eligibility /> },
              { path: "/readiness", element: <Readiness /> },
            ],
          },
        ],
      },
    ],
  },
]);
