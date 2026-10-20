import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const port = Number(env.VITE_DEV_PORT || 5173);
  const apiTarget = new URL(
    env.VITE_API_URL || "http://localhost:5000/api",
    "http://localhost:5000",
  ).origin;
  return {
    // Production uses one origin. Explicit build-shell overrides support split hosting.
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(
        process.env.VITE_API_URL ||
          (mode === "production" ? "/api" : env.VITE_API_URL || "/api"),
      ),
    },
    plugins: [react(), tailwindcss()],
    server: {
      port,
      strictPort: true,
      proxy: { "/api": { target: apiTarget } },
    },
    preview: {
      port,
      strictPort: true,
      proxy: { "/api": { target: apiTarget } },
    },
  };
});
