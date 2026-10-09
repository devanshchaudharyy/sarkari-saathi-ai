import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
export default function useProfile() {
  const { user } = useAuth();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api
      .get("/profile", { signal: controller.signal })
      .then(({ data: result }) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user.id, attempt]);
  return {
    data,
    setData,
    loading,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}
