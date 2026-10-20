import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/axios";
export default function useCatalogOptions() {
  const [attempt, setAttempt] = useState(0),
    [state, setState] = useState({ entries: [], loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ entries: [], loading: true, error: "" });
    (async () => {
      try {
        let page = 1,
          last = 1,
          entries = [];
        do {
          const { data } = await api.get(`/schemes?limit=24&page=${page}`, {
            signal: controller.signal,
          });
          last = data.pagination.totalPages;
          entries.push(...data.schemes);
          page++;
          if (last > 100) throw Error("catalog-limit");
        } while (page <= last);
        if (!controller.signal.aborted)
          setState({ entries, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            entries: [],
            loading: false,
            error:
              error.message === "catalog-limit"
                ? "This catalog is too large for this view. Open the scheme library instead."
                : errorMessage(error),
          });
      }
    })();
    return () => controller.abort();
  }, [attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
