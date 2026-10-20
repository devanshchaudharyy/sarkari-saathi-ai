import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
export default function ReminderIndicator() {
  const { user } = useAuth(),
    { t } = useLanguage(),
    [state, setState] = useState({ owner: null, count: null });
  useEffect(() => {
    let active = true,
      controller;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const { data } = await api.get("/reminders/summary", {
          signal: controller.signal,
        });
        if (active) setState({ owner: user.id, count: data.due });
      } catch {
        if (active && !controller.signal.aborted)
          setState({ owner: user.id, count: null });
      }
    };
    load();
    const interval = setInterval(load, 60000);
    const focus = () => load();
    window.addEventListener("focus", focus);
    window.addEventListener("reminders:changed", focus);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      window.removeEventListener("reminders:changed", focus);
    };
  }, [user.id]);
  const count = state.owner === user.id ? state.count : null;
  return (
    <Link
      className="reminder-indicator"
      to="/reminders"
      aria-label={
        count === null
          ? t("Open reminders")
          : t("Open reminders: {0} due", [count])
      }
    >
      <Bell size={19} />
      {count > 0 && <span>{count}</span>}
    </Link>
  );
}
