import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
import api, { errorMessage } from "../api/axios";
import Button from "../components/Button";
import Field from "../components/Field";
import ConfirmDialog from "../components/ConfirmDialog";
import Loader from "../components/Loader";
export function MailNotice({ mode }) {
  const { t } = useLanguage();
  return (
    <p className="organizer-notice">
      {t(
        mode === "preview"
          ? "Local preview mode: no email is sent. The local operator can open the private preview in reports/mail. Preview files contain sensitive links; keep them private."
          : mode === "disabled"
            ? "Email delivery is not configured. Contact the site operator."
            : "Links are sent using the configured email service. Check your inbox and spam folder.",
      )}
    </p>
  );
}
export default function Account() {
  const { user, logout } = useAuth(),
    { t } = useLanguage(),
    navigate = useNavigate();
  const [status, setStatus] = useState(null),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    api
      .get("/account", { signal: controller.signal })
      .then(({ data }) => setStatus(data))
      .catch((e) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(e));
      });
    return () => controller.abort();
  }, [user.id, retry]);
  async function verify() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/account/request-verification", {});
      setNotice(data.message);
      toast.success(t(data.message));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function open(kind) {
    setPassword("");
    setConfirmation("");
    setError("");
    setDialog(kind);
  }
  async function remove() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.delete(
        dialog === "profile" ? "/account/profile" : "/account",
        {
          data:
            dialog === "profile"
              ? { password, confirmed: true }
              : { password, confirmation },
        },
      );
      setPassword("");
      setDialog("");
      if (dialog === "account") {
        logout();
        navigate("/login", { replace: true });
      } else setNotice(data.message);
      toast.success(t(data.message));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="organizer-page account-page">
      <header className="organizer-heading">
        <span className="eyebrow">{t("YOUR ACCOUNT")}</span>
        <h1>{t("Account and privacy")}</h1>
        <p>{t("Manage email access and choose what you keep here.")}</p>
      </header>
      {loadError ? (
        <div role="alert" className="organizer-error">
          {t(loadError)}{" "}
          <Button variant="secondary" onClick={() => setRetry((v) => v + 1)}>
            {t("Try again")}
          </Button>
        </div>
      ) : !status ? (
        <Loader />
      ) : (
        <>
          <section className="organizer-panel">
            <Mail size={24} aria-hidden="true" />
            <h2>{t("Email verification")}</h2>
            <p className="account-email">{user.email}</p>
            <strong>
              {t(
                status.emailVerifiedAt
                  ? "Email verified"
                  : "Email not verified",
              )}
            </strong>
            <p>
              {t(
                "Verification confirms access to your email. It does not verify identity, documents or eligibility. Existing features remain available without it.",
              )}
            </p>
            <MailNotice mode={status.mailMode} />
            <Button
              onClick={verify}
              loading={busy && !dialog}
              disabled={
                !!status.emailVerifiedAt ||
                status.mailMode === "disabled" ||
                !!dialog
              }
            >
              {t("Prepare verification link")}
            </Button>
          </section>
          <section className="organizer-panel">
            <ShieldCheck size={24} aria-hidden="true" />
            <h2>{t("Password and access")}</h2>
            <p>
              {t(
                "Reset your password using an email link. A successful reset invalidates previous sessions on their next request.",
              )}
            </p>
            <Button to="/forgot-password" variant="secondary">
              {t("Reset password")}
            </Button>
          </section>
        </>
      )}
      {notice && (
        <p role="status" className="organizer-notice">
          {t(notice)}
        </p>
      )}
      {error && !dialog && (
        <p role="alert" className="organizer-error">
          {t(error)}
        </p>
      )}
      <section className="organizer-panel account-danger">
        <Trash2 size={24} aria-hidden="true" />
        <h2>{t("Delete personal data")}</h2>
        <p>
          {t(
            "These actions require your current password. Deletion cannot be undone.",
          )}
        </p>
        <div className="organizer-grid">
          <div>
            <h3>{t("Delete profile only")}</h3>
            <p>
              {t(
                "Remove citizen details used for screening. Keep your account, saved schemes, checklists, timelines and reminders.",
              )}
            </p>
            <Button variant="secondary" onClick={() => open("profile")}>
              {t("Delete profile")}
            </Button>
          </div>
          <div>
            <h3>{t("Delete entire account")}</h3>
            <p>
              {t(
                "Disable sign-in and queue removal of your account and private records. A minimal cleanup record remains for 24 hours after completion. Public scheme content and its audit history remain.",
              )}
            </p>
            <Button variant="danger" onClick={() => open("account")}>
              {t("Delete account")}
            </Button>
          </div>
        </div>
      </section>
      {dialog && (
        <ConfirmDialog
          title={
            dialog === "profile"
              ? "Delete your profile?"
              : "Delete your account?"
          }
          busy={busy}
          error={error}
          onCancel={() => {
            setDialog("");
            setPassword("");
          }}
          onConfirm={remove}
          confirmLabel={
            dialog === "profile"
              ? "Confirm profile deletion"
              : "Confirm account deletion"
          }
          confirmDisabled={
            !password || (dialog === "account" && confirmation !== "DELETE")
          }
        >
          <p>
            {t(
              dialog === "profile"
                ? "Your saved preparation records will remain. Screening will use an empty profile until you add details again."
                : "Sign-in will be disabled immediately. Personal records are removed by a retryable cleanup process; this cannot be undone.",
            )}
          </p>
          <Field
            id="delete-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          {dialog === "account" && (
            <Field
              id="delete-confirmation"
              label="Type DELETE to confirm"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={busy}
            />
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
