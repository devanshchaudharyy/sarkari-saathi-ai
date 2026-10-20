import { config } from "dotenv";
// Deployed environment variables take precedence; this local file is optional.
config({ path: new URL(".env.production", import.meta.url), quiet: true });
process.env.NODE_ENV = "production";
process.env.SERVE_CLIENT = "true";
await import("./server.js");
