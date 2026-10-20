import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
export default function useStaffRole() {
  const { user } = useAuth(),
    [state, setState] = useState({ owner: null, role: null });
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/catalog/access", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setState({ owner: user.id, role: data.role });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ owner: user.id, role: "citizen" });
      });
    return () => controller.abort();
  }, [user.id]);
  return state.owner === user.id ? state.role : null;
}
