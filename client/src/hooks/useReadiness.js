import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api, { errorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
export default function useReadiness() {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    owner: null,
    entries: [],
    loading: true,
    error: "",
  });
  const [busy, setBusy] = useState("");
  const [mutationError, setMutationError] = useState("");
  const active = useRef(null),
    lock = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    const run = ++generation.current,
      controller = new AbortController();
    active.current?.abort();
    lock.current = false;
    setBusy("");
    setMutationError("");
    setState({ owner: user.id, entries: [], loading: true, error: "" });
    api
      .get("/readiness", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted && run === generation.current)
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
  }, [user.id, attempt]);
  async function mutate(entry, method, data, message) {
    if (lock.current) return false;
    const previousFocus = document.activeElement;
    lock.current = true;
    setBusy(entry.slug);
    setMutationError("");
    const controller = new AbortController(),
      run = generation.current;
    active.current = controller;
    try {
      const response = await api.request({
        url: `/readiness/${encodeURIComponent(entry.slug)}`,
        method,
        data,
        signal: controller.signal,
      });
      if (controller.signal.aborted || run !== generation.current) return false;
      setState((current) => ({
        ...current,
        entries: current.entries
          .map((row) =>
            row.slug !== entry.slug
              ? row
              : method === "DELETE"
                ? {
                    ...row,
                    saved: false,
                    revision: null,
                    saveId: null,
                    createdAt: null,
                    updatedAt: null,
                    versionChanged: false,
                    items: row.items.map((item) => ({
                      ...item,
                      completed: false,
                    })),
                    progress: {
                      ...row.progress,
                      completed: 0,
                      percentage: 0,
                      complete: false,
                    },
                  }
                : response.data.entry,
          )
          .filter((row) => row.available || row.saved),
      }));
      toast.success(message);
      return true;
    } catch (error) {
      if (controller.signal.aborted || run !== generation.current) return false;
      setMutationError(
        error.response?.status === 409
          ? "This checklist changed in another window. Reload saved schemes before making another change."
          : `${errorMessage(error)} Your last confirmed progress is still shown. Reload to confirm whether the update reached the server.`,
      );
      toast.error("Readiness update could not be confirmed.");
      return false;
    } finally {
      if (run === generation.current) {
        lock.current = false;
        setBusy("");
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
    mutationError,
    retry: () => {
      if (!lock.current) setAttempt((n) => n + 1);
    },
    save: (entry) =>
      mutate(entry, "PUT", {}, "Scheme saved to your preparation list."),
    toggle: (entry, item) =>
      mutate(
        entry,
        "PATCH",
        {
          itemId: item.id,
          completed: !item.completed,
          templateVersion: entry.templateVersion,
          revision: entry.revision,
          saveId: entry.saveId,
        },
        item.completed
          ? "Preparation task marked incomplete."
          : "Preparation task saved.",
      ),
    remove: (entry) =>
      mutate(
        entry,
        "DELETE",
        { revision: entry.revision, saveId: entry.saveId },
        "Scheme and checklist progress removed from your saved list.",
      ),
  };
}
