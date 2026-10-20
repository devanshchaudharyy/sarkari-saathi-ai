import { config } from "dotenv";
import { parseEnvironment } from "./environment.js";
// Production loads only host variables or the launcher's dedicated file.
if (process.env.NODE_ENV !== "production") config({ quiet: true });
export const env = parseEnvironment(process.env);
