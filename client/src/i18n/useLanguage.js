import { useSyncExternalStore } from "react";
import { LANGUAGE_KEY, supportedLanguage, createTranslator } from "./core";
function storedLanguage() {
  try {
    return supportedLanguage(localStorage.getItem(LANGUAGE_KEY));
  } catch {
    return "en";
  }
}
let state = { language: "en", pending: false, languageError: "" };
let translate = createTranslator(),
  dictionaryReady = false,
  request = 0;
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => state;
function update(value) {
  state = { ...state, ...value };
  for (const listener of listeners) listener();
}
export const t = (value, variables) =>
  translate(value, state.language, variables);
export async function setLanguage(value, persist = true) {
  const language = supportedLanguage(value),
    current = ++request;
  if (language === "hi" && !dictionaryReady) {
    update({ pending: true, languageError: "" });
    try {
      const { default: hindi } = await import("./hi.json");
      translate = createTranslator(hindi);
      dictionaryReady = true;
    } catch {
      if (current === request)
        update({
          pending: false,
          languageError:
            "Hindi could not be loaded. Reload the page and try again.",
        });
      return false;
    }
  }
  if (current !== request) return false;
  document.documentElement.lang = language;
  if (persist) {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* In-memory switching remains available. */
    }
  }
  update({ language, pending: false, languageError: "" });
  return true;
}
document.documentElement.lang = "en";
if (storedLanguage() === "hi") void setLanguage("hi", false);
window.addEventListener("storage", (event) => {
  if (event.key === LANGUAGE_KEY || event.key === null)
    void setLanguage(storedLanguage(), false);
});
export function useLanguage() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  return {
    ...current,
    setLanguage,
    t,
    locale: current.language === "hi" ? "hi-IN" : "en-IN",
  };
}
