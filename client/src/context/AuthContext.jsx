import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api, {
  readToken,
  setSessionToken,
  errorMessage,
  TOKEN_KEY,
} from "../api/axios";
const Context = createContext(null);
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [token, setToken] = useState(readToken),
    [loading, setLoading] = useState(true),
    [sessionError, setSessionError] = useState("");
  const generation = useRef(0);
  function clear() {
    generation.current++;
    setSessionToken(null);
    setToken(null);
    setUser(null);
    setSessionError("");
  }
  async function check() {
    const current = ++generation.current;
    setLoading(true);
    setSessionError("");
    if (!readToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      if (current === generation.current) setUser(data.user);
    } catch (error) {
      if (current !== generation.current) return;
      if (error.response?.status === 401) clear();
      else setSessionError(errorMessage(error));
    } finally {
      if (current === generation.current || !readToken()) setLoading(false);
    }
  }
  useEffect(() => {
    check();
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          !/\/auth\/(login|register)$/.test(error.config?.url || "") &&
          error.config?.headers?.Authorization === `Bearer ${readToken()}`
        ) {
          clear();
          toast.error("Your session has expired. Please sign in again.");
        }
        return Promise.reject(error);
      },
    );
    const sync = (event) => {
      if (event.key === TOKEN_KEY) {
        setSessionToken(readToken());
        setToken(readToken());
        setUser(null);
        check();
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      generation.current++;
      api.interceptors.response.eject(interceptor);
      window.removeEventListener("storage", sync);
    };
  }, []);
  async function authenticate(path, input) {
    const { data } = await api.post(path, input);
    generation.current++;
    setSessionToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setSessionError("");
    toast.success(
      path.endsWith("register")
        ? "Account created. Welcome to SarkariSaathi!"
        : "Welcome back!",
    );
    return data.user;
  }
  return (
    <Context.Provider
      value={{
        user,
        token,
        loading,
        sessionError,
        retry: check,
        login: (input) => authenticate("/auth/login", input),
        register: (input) => authenticate("/auth/register", input),
        logout: () => {
          clear();
          toast.success("You have been signed out.");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
