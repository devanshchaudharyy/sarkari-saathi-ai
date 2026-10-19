import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api, { errorMessage } from "../api/axios";
import { useLanguage } from "../i18n/useLanguage";

// A page-local screening session: no answer persistence or second rule engine.
export default function useDiscovery(initial) {
  const { t } = useLanguage();
  const [report, setReport] = useState(initial),
    [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState("{}"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef(null),
    locked = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  function update(key, value) {
    if (locked.current) return;
    setAnswers((current) => ({
      ...current,
      [key]: value,
      ...(key === "upStage" ? { upStageRequirementsMet: null } : {}),
    }));
    setError("");
  }
  async function check() {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    const current = new AbortController();
    controller.current = current;
    const payload = { answers: { ...answers } };
    try {
      const { data } = await api.post("/eligibility", payload, {
        signal: current.signal,
      });
      if (current.signal.aborted) return false;
      setReport(data);
      setSubmitted(JSON.stringify(payload.answers));
      toast.success(
        t("Shortlist updated. Review the reasons and official requirements."),
      );
      return true;
    } catch (error) {
      if (current.signal.aborted) return false;
      setError(`${errorMessage(error)} Your answers are still here.`);
      toast.error(t("The shortlist could not be updated."));
      return false;
    } finally {
      if (!current.signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  return {
    report,
    answers,
    update,
    check,
    busy,
    error,
    dirty: JSON.stringify(answers) !== submitted,
    hasExtraAnswers: submitted !== "{}",
    reset: () => {
      if (!locked.current) {
        setAnswers({});
        setError("");
      }
    },
  };
}
