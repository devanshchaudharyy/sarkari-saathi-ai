import express from "express";
import compression from "compression";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
export const clientDirectory = fileURLToPath(
  new URL("../../../client/dist/", import.meta.url),
);
export function assertClientBuild(directory = clientDirectory) {
  if (!existsSync(join(directory, "index.html"))) {
    const error = new Error(
      "Production frontend is missing. Run npm run build before npm start.",
    );
    error.code = "CLIENT_BUILD_MISSING";
    throw error;
  }
}
export function mountClient(app, directory = clientDirectory) {
  // Site assets only: private API/token responses do not pass through this middleware.
  app.use(compression());
  // Only Vite fingerprinted assets receive immutable caching. HTML revalidates.
  app.use(
    express.static(directory, {
      index: false,
      redirect: false,
      dotfiles: "ignore",
      maxAge: 0,
      setHeaders(res, path) {
        res.setHeader(
          "Cache-Control",
          /[\\/]assets[\\/].+-[\w-]{8,}\.[\w]+$/.test(path)
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        );
      },
    }),
  );
  app.get("/{*path}", (req, res, next) => {
    // Never turn API misses, missing assets or private dotfiles into HTML.
    const path = decodeURIComponent(req.path).toLowerCase();
    if (
      path === "/api" ||
      path.startsWith("/api/") ||
      path.startsWith("/assets/") ||
      path.split("/").some((part) => part.startsWith(".")) ||
      extname(path) ||
      !req.accepts("html")
    )
      return next();
    res
      .set("Cache-Control", "no-cache")
      .sendFile(join(directory, "index.html"));
  });
}
