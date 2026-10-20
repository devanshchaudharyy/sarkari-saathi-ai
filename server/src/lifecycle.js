// Idempotent drain with a bounded deadline. Existing requests get time to finish.
export function createShutdown({
  app,
  server,
  disconnect,
  exit = (code) => process.exit(code),
  timeout = 10000,
}) {
  let stopping = false;
  return () => {
    if (stopping) return;
    stopping = true;
    app.locals.draining = true;
    const timer = setTimeout(() => {
      server.closeAllConnections();
      exit(1);
    }, timeout);
    timer.unref();
    server.close(async (error) => {
      try {
        await disconnect();
        clearTimeout(timer);
        exit(error ? 1 : 0);
      } catch {
        clearTimeout(timer);
        exit(1);
      }
    });
  };
}
