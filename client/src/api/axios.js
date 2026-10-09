import axios from "axios";
export const TOKEN_KEY = "sarkarisaathi.token.v1";
export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Authentication remains available in memory when storage is blocked. */
  }
}
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});
let sessionToken = readToken();
export const setSessionToken = (token) => {
  sessionToken = token;
  saveToken(token);
};
api.interceptors.request.use((config) => {
  if (sessionToken) config.headers.Authorization = `Bearer ${sessionToken}`;
  return config;
});
export function errorMessage(error) {
  return (
    error.response?.data?.message ||
    (error.code === "ECONNABORTED"
      ? "The server took too long to respond. Please try again."
      : !error.response
        ? "Unable to reach the server. Check your connection and try again."
        : "Something went wrong. Please try again.")
  );
}
export default api;
