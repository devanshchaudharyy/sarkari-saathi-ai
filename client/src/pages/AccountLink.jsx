import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Button from "../components/Button";
import Field from "../components/Field";
import { MailNotice } from "./Account";
import { useLanguage } from "../i18n/useLanguage";
import api, { errorMessage } from "../api/axios";
function readLink() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const value = params.get("token") || "";
  return /^[a-f0-9]{64}$/.test(value) && [...params.keys()].length === 1
    ? value
    : "";
}
export default function AccountLink({ action }) {
  const { t } = useLanguage(),
    forgot = action === "forgot",
    reset = action === "reset";
  const [token, setToken] = useState(readLink),
    [mode, setMode] = useState(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({}),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    locked = useRef(false);
  useEffect(() => {
    const capture = () => {
      if (!window.location.hash) return;
      setToken(readLink());
      setSuccess("");
      setError("");
      setPassword("");
      setConfirm("");
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    };
    capture();
    window.addEventListener("hashchange", capture);
    const controller = new AbortController();
    if (forgot)
      api
        .get("/account/capabilities", { signal: controller.signal })
        .then(({ data }) => setMode(data.mailMode))
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorMessage(e));
        });
    return () => {
      controller.abort();
      window.removeEventListener("hashchange", capture);
    };
  }, [forgot]);
  async function submit(event) {
    event.preventDefault();
    if (locked.current) return;
    const next = {};
    if (
      forgot &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.trim().length > 254)
    )
      next.email = "Enter a valid email address.";
    if (
      reset &&
      (password.length < 8 || new TextEncoder().encode(password).length > 72)
    )
      next.password = "Use at least 8 characters and at most 72 UTF-8 bytes.";
    if (reset && password !== confirm) next.confirm = "Passwords must match.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const { data } = await api.post(
        forgot
          ? "/account/request-reset"
          : reset
            ? "/account/reset-password"
            : "/account/verify-email",
        forgot ? { email } : reset ? { token, password } : { token },
      );
      setSuccess(data.message);
      setPassword("");
      setConfirm("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function edit(setter, key, value) {
    setter(value);
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setError("");
  }
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="account-link-page page-enter"
    >
      <header>
        <Brand />
        <LanguageSwitcher />
      </header>
      <section className="organizer-panel account-link-card">
        <span className="account-link-icon">
          <ShieldCheck size={30} />
        </span>
        <span className="eyebrow">{t("ACCOUNT ACCESS")}</span>
        <h1>
          {t(
            forgot
              ? "Forgot your password?"
              : reset
                ? "Choose a new password"
                : "Confirm your email",
          )}
        </h1>
        <p>
          {t(
            forgot
              ? "Request a private, single-use reset link."
              : reset
                ? "Use a unique password. Your previous sessions will be invalidated."
                : "Confirming this link verifies access to your email, not identity or eligibility.",
          )}
        </p>
        {forgot && mode && <MailNotice mode={mode} />}
        {success ? (
          <>
            <p role="status" className="organizer-notice">
              {t(success)}
            </p>
            <Button to={forgot ? "/login" : reset ? "/login" : "/account"}>
              {t(reset ? "Sign in with new password" : "Continue")}
            </Button>
          </>
        ) : !forgot && !token ? (
          <>
            <p role="alert" className="organizer-error">
              {t("This link is invalid or expired. Request a new link.")}
            </p>
            <Button to={reset ? "/forgot-password" : "/account"}>
              {t("Request a new link")}
            </Button>
          </>
        ) : (
          <form noValidate onSubmit={submit}>
            {forgot && (
              <Field
                id="recovery-email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={email}
                maxLength={254}
                onChange={(e) => edit(setEmail, "email", e.target.value)}
                error={errors.email}
                disabled={busy}
              />
            )}
            {reset && (
              <>
                <Field
                  id="new-password"
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) =>
                    edit(setPassword, "password", e.target.value)
                  }
                  error={errors.password}
                  disabled={busy}
                />
                <Field
                  id="confirm-password"
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => edit(setConfirm, "confirm", e.target.value)}
                  error={errors.confirm}
                  disabled={busy}
                />
              </>
            )}
            {error && (
              <p role="alert" className="organizer-error">
                {t(error)}
              </p>
            )}
            <Button
              type="submit"
              loading={busy}
              disabled={forgot && (!mode || mode === "disabled")}
            >
              {t(
                forgot
                  ? "Prepare reset link"
                  : reset
                    ? "Save new password"
                    : "Confirm email access",
              )}
            </Button>
          </form>
        )}
        <Link to="/login" className="account-back">
          {t("Back to sign in")}
        </Link>
        <p className="account-link-disclaimer">
          {t("Independent project. Not an official government service.")}
        </p>
      </section>
    </main>
  );
}
