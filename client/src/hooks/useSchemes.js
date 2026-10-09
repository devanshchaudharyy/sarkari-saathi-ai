import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/axios";
export default function useSchemes(path) {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState({
    path: null,
    data: null,
    loading: true,
    error: null,
    status: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    setResource({ path, data: null, loading: true, error: null, status: null });
    api
      .get(path, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setResource({
            path,
            data,
            loading: false,
            error: null,
            status: null,
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResource({
            path,
            data: null,
            loading: false,
            error: errorMessage(error),
            status: error.response?.status,
          });
      });
    return () => controller.abort();
  }, [path, attempt]);
  // Never display results for the previous URL while the next effect is pending.
  return {
    ...(resource.path === path
      ? resource
      : { data: null, loading: true, error: null, status: null }),
    retry: () => setAttempt((value) => value + 1),
  };
}
