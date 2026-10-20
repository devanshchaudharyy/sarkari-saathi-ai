import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/useLanguage";
import { toast } from "sonner";
export default function usePrivateCollection(endpoint) {
  const { user } = useAuth(),
    { t } = useLanguage();
  const [attempt, setAttempt] = useState(0),
    [busy, setBusy] = useState(false);
  const [state, setState] = useState({
    owner: null,
    entries: [],
    loading: true,
    error: "",
  });
  const generation = useRef(0),
    lock = useRef(false),
    active = useRef(null);
  useEffect(() => {
    const run = ++generation.current,
      controller = new AbortController();
    active.current?.abort();
    lock.current = false;
    setBusy(false);
    setState({ owner: user.id, entries: [], loading: true, error: "" });
    api
      .get(endpoint, { signal: controller.signal })
      .then(({ data }) => {
        if (run === generation.current && !controller.signal.aborted)
          setState({
            owner: user.id,
            entries: data.entries,
            loading: false,
            error: "",
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted && run === generation.current)
          setState({
            owner: user.id,
            entries: [],
            loading: false,
            error: errorMessage(error),
          });
      });
    return () => {
      controller.abort();
      active.current?.abort();
      generation.current++;
    };
  }, [user.id, endpoint, attempt]);
  async function mutate(method, path, data) {
    if (lock.current) return false;
    const previousFocus = document.activeElement;
    lock.current = true;
    setBusy(true);
    const run = generation.current,
      controller = new AbortController();
    active.current = controller;
    try {
      const response = await api.request({
        method,
        url: `${endpoint}${path}`,
        data,
        signal: controller.signal,
      });
      if (run !== generation.current || controller.signal.aborted) return false;
      setState((current) => ({
        ...current,
        error: "",
        entries: response.data.entry
          ? [
              response.data.entry,
              ...current.entries.filter(
                (row) => row.id !== response.data.entry.id,
              ),
            ]
          : current.entries.filter((row) => row.id !== response.data.removedId),
      }));
      if (endpoint === "/reminders")
        window.dispatchEvent(new Event("reminders:changed"));
      toast.success(t("Your change is saved."));
      return true;
    } catch (error) {
      if (run === generation.current && !controller.signal.aborted) {
        setState((current) => ({
          ...current,
          error: `${errorMessage(error)} Reload to confirm the latest saved record.`,
        }));
        toast.error(t("The change could not be confirmed."));
      }
      return false;
    } finally {
      if (run === generation.current) {
        lock.current = false;
        setBusy(false);
        requestAnimationFrame(() => {
          if (
            previousFocus?.isConnected &&
            document.activeElement === document.body
          )
            previousFocus.focus({ preventScroll: true });
        });
      }
    }
  }
  return {
    ...(state.owner === user.id
      ? state
      : { entries: [], loading: true, error: "" }),
    busy,
    mutate,
    reload: () => setAttempt((value) => value + 1),
  };
}
