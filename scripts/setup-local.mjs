import { randomBytes } from "node:crypto";
import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { parseEnvironment } from "../server/src/config/environment.js";

export async function setupLocal(root) {
  const create = async (name, content) => {
    try {
      await writeFile(resolve(root, name), content, {
        flag: "wx",
        mode: 0o600,
      });
      return true;
    } catch (error) {
      if (error.code === "EEXIST") return false;
      throw error;
    }
  };
  const serverPath = resolve(root, "server/.env");
  let existing;
  try {
    existing = await readFile(serverPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!existing) {
    await create(
      "server/.env",
      `PORT=5000\nMONGO_URI=mongodb://127.0.0.1:27017/sarkari_saathi_ai\nJWT_SECRET=${randomBytes(48).toString("base64url")}\nJWT_EXPIRES_IN=7d\nCLIENT_URL=http://localhost:5173\nNODE_ENV=development\nSERVE_CLIENT=false\n`,
    );
    existing = await readFile(serverPath, "utf8");
  }
  const env = parseEnvironment(parse(existing));
  await create(
    "client/.env",
    `VITE_API_URL=http://localhost:${env.PORT}/api\nVITE_DEV_PORT=${new URL(env.CLIENT_URL).port || "5173"}\n`,
  );
  // Preserve the latest local database and auth secret; never overwrite any file.
  await create(
    "server/.env.production",
    `PORT=5176\nMONGO_URI=${env.MONGO_URI}\nJWT_SECRET=${env.JWT_SECRET}\nJWT_EXPIRES_IN=${env.JWT_EXPIRES_IN}\nCLIENT_URL=http://localhost:5176\nNODE_ENV=production\nSERVE_CLIENT=true\n`,
  );
  return { developmentPort: env.PORT, productionPort: 5176 };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const root = fileURLToPath(new URL("../", import.meta.url));
    await access(resolve(root, "server"));
    const result = await setupLocal(root);
    console.log(
      `Local configuration ready; existing files preserved. Development API: ${result.developmentPort}. Production example: http://localhost:${result.productionPort}.`,
    );
  } catch (error) {
    console.error("Local setup failed:", error.message);
    process.exitCode = 1;
  }
}
