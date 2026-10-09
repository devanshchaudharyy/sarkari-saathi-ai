import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  ShieldCheck,
  Info,
  RotateCcw,
  Check,
  LoaderCircle,
} from "lucide-react";
import Field from "../components/Field";
import SelectField from "../components/SelectField";
import Button from "../components/Button";
import ProfileProgress from "../components/ProfileProgress";
import LeaveProfileDialog from "../components/LeaveProfileDialog";
import useProfile from "../hooks/useProfile";
import api, { errorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  STATES_AND_UTS,
  OCCUPATIONS,
  MAX_INCOME,
  profileCompletion,
} from "../../../shared/profile.js";
const toForm = (profile) => ({
  age: profile.age === null ? "" : String(profile.age),
  state: profile.state || "",
  district: profile.district || "",
  occupation: profile.occupation || "",
  annualHouseholdIncome:
    profile.annualHouseholdIncome === null
      ? ""
      : String(profile.annualHouseholdIncome),
});
function toPayload(values) {
  return {
    age: values.age === "" ? null : Number(values.age),
    state: values.state || null,
    district: values.district.trim(),
    occupation: values.occupation || null,
    annualHouseholdIncome:
      values.annualHouseholdIncome === ""
        ? null
        : Number(values.annualHouseholdIncome),
  };
}
export default function Profile() {
  const resource = useProfile();
  return (
    <>
      <span className="eyebrow">YOUR DETAILS. YOUR PACE.</span>
      <div className="profile-page-heading">
        <div>
          <h1>Let’s get to know you.</h1>
          <p className="dashboard-subtitle">
            A few basics today. A clearer starting point for tomorrow.
          </p>
        </div>
        <Button to="/dashboard" variant="ghost">
          <ArrowLeft size={16} /> Overview
        </Button>
      </div>
      {resource.loading ? (
        <div className="profile-loading" role="status">
          <LoaderCircle className="spin" size={24} />
          <span>Retrieving your profile</span>
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      ) : resource.error ? (
        <div className="profile-load-error" role="alert">
          <h2>We couldn’t load your profile</h2>
          <p>{resource.error}</p>
          <Button onClick={resource.retry}>Try again</Button>
        </div>
      ) : (
        <ProfileForm initial={resource.data} onSaved={resource.setData} />
      )}
    </>
  );
}
function ProfileForm({ initial, onSaved }) {
  const { user } = useAuth();
  const [values, setValues] = useState(() => toForm(initial.profile)),
    [saved, setSaved] = useState(() => toForm(initial.profile)),
    [errors, setErrors] = useState({}),
    [busy, setBusy] = useState(false),
    [serverError, setServerError] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const completion = profileCompletion(toPayload(values));
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  function update(event) {
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      ...(event.target.name === "state" ? { district: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [event.target.name]: "" }));
    setServerError("");
  }
  function validate() {
    const result = {};
    if (
      values.age !== "" &&
      (!Number.isInteger(Number(values.age)) ||
        Number(values.age) < 0 ||
        Number(values.age) > 120)
    )
      result.age = "Enter a whole-number age between 0 and 120.";
    if (
      values.annualHouseholdIncome !== "" &&
      (!Number.isInteger(Number(values.annualHouseholdIncome)) ||
        Number(values.annualHouseholdIncome) < 0 ||
        Number(values.annualHouseholdIncome) > MAX_INCOME)
    )
      result.annualHouseholdIncome =
        "Enter a whole number between ₹0 and ₹1,00,00,00,000.";
    if (values.state && !STATES_AND_UTS.includes(values.state))
      result.state = "Choose a state or Union Territory from the list.";
    if (
      values.occupation &&
      !OCCUPATIONS.some((option) => option.value === values.occupation)
    )
      result.occupation = "Choose an occupation from the list.";
    if (
      values.district.trim() &&
      (values.district.trim().length < 2 || values.district.trim().length > 80)
    )
      result.district = "Use between 2 and 80 characters, or leave this blank.";
    setErrors(result);
    return !Object.keys(result).length;
  }
  async function save(event) {
    event.preventDefault();
    if (busy || !dirty) return;
    if (!validate()) {
      requestAnimationFrame(() =>
        document.querySelector("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    setBusy(true);
    setServerError("");
    try {
      const { data } = await api.put("/profile", toPayload(values));
      const updated = toForm(data.profile);
      setValues(updated);
      setSaved(updated);
      onSaved(data);
      toast.success(
        data.completion.isComplete
          ? "Profile complete. Your details are saved."
          : "Profile draft saved. Continue whenever you’re ready.",
      );
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setValues({ ...saved });
    setErrors({});
    setServerError("");
  }
  return (
    <div className="profile-layout page-enter">
      <form
        className="profile-form-card"
        onSubmit={save}
        noValidate
        aria-label="Citizen profile"
      >
        <div className="profile-section-heading">
          <span className="icon-box indigo">
            <ShieldCheck size={23} />
          </span>
          <div>
            <h2>Start with the essentials</h2>
            <p>Save a little now. Come back to the rest later.</p>
          </div>
        </div>
        <div className="profile-account-summary">
          <span className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <span className="badge green">Your account</span>
        </div>
        <fieldset disabled={busy}>
          <legend className="sr-only">Citizen details</legend>
          <div className="profile-form-grid">
            <Field
              id="profile-age"
              name="age"
              label="Age"
              type="number"
              inputMode="numeric"
              min="0"
              max="120"
              step="1"
              placeholder="e.g. 22"
              value={values.age}
              onChange={update}
              error={errors.age}
              helper="Your current age in completed years."
            />
            <SelectField
              id="profile-occupation"
              name="occupation"
              label="Occupation"
              placeholder="Choose your current situation"
              options={OCCUPATIONS}
              value={values.occupation}
              onChange={update}
              error={errors.occupation}
              helper="Select the option that best describes you."
            />
            <SelectField
              id="profile-state"
              name="state"
              label="State / Union Territory"
              placeholder="Choose your state / UT"
              options={STATES_AND_UTS.map((state) => ({
                value: state,
                label: state,
              }))}
              value={values.state}
              onChange={update}
              error={errors.state}
              helper="Where you currently live."
            />
            <Field
              id="profile-district"
              name="district"
              label="District (optional)"
              maxLength={80}
              placeholder="e.g. Muzaffarnagar"
              value={values.district}
              onChange={update}
              error={errors.district}
              helper="Changing your state clears this field."
            />
            <div className="income-field">
              <Field
                id="profile-income"
                name="annualHouseholdIncome"
                label="Annual household income (₹)"
                type="number"
                inputMode="numeric"
                min="0"
                max={MAX_INCOME}
                step="1"
                placeholder="e.g. 240000"
                value={values.annualHouseholdIncome}
                onChange={update}
                error={errors.annualHouseholdIncome}
                helper="Estimated total income of your household for one year, in whole rupees. Enter 0 if there is no income."
              />
            </div>
          </div>
        </fieldset>
        <div className="profile-info">
          <Info size={17} />
          <p>
            All fields can be left blank when saving a draft. Adding the four
            core details completes your profile; district is optional.
          </p>
        </div>
        {serverError ? (
          <div role="alert" className="form-alert">
            {serverError} Your changes are still here; try saving again.
          </div>
        ) : null}
        <div className="profile-form-actions">
          <span
            role="status"
            className={dirty ? "unsaved-status" : "saved-status"}
          >
            {dirty ? (
              <>
                <span className="small-dot" /> Unsaved changes
              </>
            ) : initial.profile.updatedAt ? (
              <>
                <Check size={15} /> All changes saved
              </>
            ) : (
              "Your profile is not saved yet"
            )}
          </span>
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              disabled={!dirty || busy}
            >
              <RotateCcw size={15} /> Reset changes
            </Button>
            <Button type="submit" loading={busy} disabled={!dirty || busy}>
              <Save size={16} />
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </form>
      <aside className="profile-aside">
        <div className="profile-summary-card">
          <span className="eyebrow">YOUR STARTING POINT</span>
          <h2>A little more about you.</h2>
          <ProfileProgress
            completion={completion}
            label={dirty ? "Draft completion" : "Saved profile completion"}
            checklist
          />
          {dirty ? (
            <p className="draft-explanation">
              This previews your current edits. Save to update your dashboard.
            </p>
          ) : null}
          <div className="completion-status">
            <span className={`badge ${completion.isComplete ? "green" : ""}`}>
              {completion.isComplete
                ? "Core details complete"
                : completion.completedFields
                  ? "In progress"
                  : "Not started"}
            </span>
            <p>
              Completion describes the details you’ve added. It does not confirm
              scheme eligibility.
            </p>
          </div>
        </div>
        <div className="profile-privacy-card">
          <ShieldCheck size={22} />
          <h3>You control what you share.</h3>
          <p>
            Details are stored only after you select Save profile. We don’t ask
            for identity numbers, bank details, or documents here.
          </p>
          <p>
            These details are a foundation for future features. Scheme matching
            and AI assistance aren’t available yet.
          </p>
        </div>
      </aside>
      {blocker.state === "blocked" ? (
        <LeaveProfileDialog blocker={blocker} busy={busy} dirty={dirty} />
      ) : null}
    </div>
  );
}
