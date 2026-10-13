import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req) =>
            req.url?.split("?")[0] === "/face-processor.html"
              ? "'unsafe-eval'"
              : "'wasm-unsafe-eval'",
        ],
        workerSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "blob:", "data:"],
        connectSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.get(
  "/api/health",
  rateLimit({ windowMs: 60000, limit: 120 }),
  (_req, res) =>
    res.json({
      status: "ok",
      avatarProvider: "local-mediapipe",
      photoStorage: "none",
    }),
);
const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
app.use(
  express.static(dist, {
    maxAge: "1h",
    setHeaders(res, file) {
      if (file.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  }),
);
app.get("/{*path}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
app.listen(Number(process.env.PORT || 3000), "0.0.0.0", (error?: Error) => {
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Photo Smash running on port ${process.env.PORT || 3000}`);
});
