import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../api/axios";
export default function useEligibility() {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState({
    owner: null,
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    setResource({ owner: user.id, data: null, loading: true, error: null });
    api
      .get("/eligibility", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setResource({ owner: user.id, data, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResource({
            owner: user.id,
            data: null,
            loading: false,
            error: errorMessage(error),
          });
      });
    return () => controller.abort();
  }, [user.id, attempt]);
  return {
    ...(resource.owner === user.id
      ? resource
      : { data: null, loading: true, error: null }),
    retry: () => setAttempt((current) => current + 1),
  };
}
