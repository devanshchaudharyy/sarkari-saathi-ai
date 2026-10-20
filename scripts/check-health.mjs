const base = process.env.FRONTEND_URL || "http://localhost:5176";
const deadline = Date.now() + 30000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch(new URL("/api/ready", base), {
      signal: AbortSignal.timeout(2500),
    });
    if (response.ok && (await response.json()).success === true) {
      ready = true;
      break;
    }
  } catch {
    /* Wait for startup without printing environment details. */
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) {
  console.error(
    "Readiness check failed. Verify server startup and MongoDB availability.",
  );
  process.exitCode = 1;
} else console.log("Production site and database are ready.");
