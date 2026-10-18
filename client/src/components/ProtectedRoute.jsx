import { useLanguage } from "../i18n/useLanguage";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";
import Button from "./Button";
export default function ProtectedRoute() {
  const { t } = useLanguage();
  const auth = useAuth(),
    location = useLocation();
  if (auth.loading) return <Loader />;
  if (auth.sessionError && auth.token)
    return (
      <main id="main-content" tabIndex={-1} className="session-error">
        <h1>{t("We couldn\u2019t reconnect")}</h1>
        <p>{t(auth.sessionError)}</p>
        <Button onClick={auth.retry}>{t("Try again")}</Button>
        <Button variant="ghost" onClick={auth.logout}>
          {t("Sign out")}
        </Button>
      </main>
    );
  return auth.user ? (
    <Outlet />
  ) : (
    <Navigate
      to="/login"
      replace
      state={{
        from: `${location.pathname}${location.search}`,
      }}
    />
  );
}
