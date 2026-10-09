import { useState } from "react";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Compass,
  BookOpen,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Brand from "../components/Brand";
import Button from "../components/Button";
import Field from "../components/Field";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api/axios";
import { safeReturnPath } from "../utils/returnPath";
export default function AuthPage({ register = false }) {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [values, setValues] = useState({ name: "", email: "", password: "" }),
    [errors, setErrors] = useState({}),
    [serverError, setServerError] = useState(""),
    [busy, setBusy] = useState(false);
  const from = location.state?.from;
  const destination = safeReturnPath(from);
  if (auth.loading) return <Loader />;
  if (auth.user) return <Navigate to={destination} replace />;
  function validate() {
    const result = {};
    if (
      register &&
      (values.name.trim().length < 2 || values.name.trim().length > 80)
    )
      result.name = "Enter a name between 2 and 80 characters.";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ||
      values.email.trim().length > 254
    )
      result.email = "Enter a valid email address.";
    if (!values.password) result.password = "Enter your password.";
    else if (
      register &&
      (values.password.length < 8 ||
        new TextEncoder().encode(values.password).length > 72)
    )
      result.password = "Use at least 8 characters and at most 72 UTF-8 bytes.";
    setErrors(result);
    return !Object.keys(result).length;
  }
  async function submit(event) {
    event.preventDefault();
    setServerError("");
    if (!validate()) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setBusy(true);
    try {
      await (register
        ? auth.register(values)
        : auth.login({ email: values.email, password: values.password }));
      navigate(destination, { replace: true });
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  const update = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: "" });
    setServerError("");
  };
  return (
    <main id="main-content" tabIndex={-1} className="auth-page page-enter">
      <aside className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="eyebrow">A CLEARER PATH TO POSSIBILITY</span>
          <h1>
            Discover opportunities
            <br /> made for <em>you.</em>
          </h1>
          <p>
            Public benefits can be complex.
            <br /> Understanding them shouldn’t be.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="auth-orbit" />
            <span className="auth-center">
              <Compass size={44} />
            </span>
            <span className="auth-satellite sat-one">
              <BookOpen size={25} />
            </span>
            <span className="auth-satellite sat-two">
              <ShieldCheck size={25} />
            </span>
            <span className="auth-satellite sat-three">
              <Check size={24} />
            </span>
          </div>
          <div className="auth-values">
            <span>
              <Check size={15} /> Clear by design
            </span>
            <span>
              <Check size={15} /> Privacy in mind
            </span>
          </div>
        </div>
        <p className="auth-disclaimer">
          Independent project · Not an official government service
        </p>
      </aside>
      <section className="auth-form-side">
        <Link className="back-link" to="/">
          ← Back to home
        </Link>
        <div className="auth-form-card">
          <span className="eyebrow">
            {register
              ? "YOUR JOURNEY STARTS HERE"
              : "YOUR SPACE, YOUR POSSIBILITIES"}
          </span>
          <h2>{register ? "Create your account" : "Welcome back."}</h2>
          <p>
            {register
              ? "A simple first step toward a little more clarity."
              : "Sign in to your SarkariSaathi account."}
          </p>
          <form onSubmit={submit} noValidate>
            {register ? (
              <Field
                id="name"
                name="name"
                label="Full name"
                placeholder="Your full name"
                autoComplete="name"
                value={values.name}
                onChange={update}
                error={errors.name}
                maxLength={80}
              />
            ) : null}
            <Field
              id="email"
              name="email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              autoComplete="email"
              value={values.email}
              onChange={update}
              error={errors.email}
              maxLength={254}
            />
            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder={
                register ? "Create a strong password" : "Enter your password"
              }
              autoComplete={register ? "new-password" : "current-password"}
              value={values.password}
              onChange={update}
              error={errors.password}
              helper={
                register
                  ? "At least 8 characters. Use a unique password."
                  : undefined
              }
            />
            {serverError ? (
              <div role="alert" className="form-alert">
                {serverError}
              </div>
            ) : null}
            <Button type="submit" loading={busy} className="w-full">
              {busy
                ? register
                  ? "Creating your account…"
                  : "Signing you in…"
                : register
                  ? "Create account"
                  : "Sign in"}{" "}
              {!busy ? <ArrowRight size={18} /> : null}
            </Button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to SarkariSaathi?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Log in" : "Create an account"}
            </Link>
          </p>
          <div className="auth-privacy">
            <ShieldCheck size={18} />
            <span>
              Only the basics. Your name, email, and a securely hashed password.
            </span>
          </div>
          {register ? (
            <p className="auth-availability">
              Accounts, profiles and public scheme browsing are available today.
              Personalised discovery and AI features are coming in future
              phases.
            </p>
          ) : null}
        </div>
        <span className="auth-bottom">
          A little clarity. A world of possibility.
        </span>
      </section>
    </main>
  );
}
