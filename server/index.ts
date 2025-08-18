import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { enforceCorsForStaticOrigin } from "./middleware/enforceCorsForStaticOrigin";

// Set CAR_SHEET_CSV env variable if not already set
if (!process.env.CAR_SHEET_CSV) {
  process.env.CAR_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQc5Sd7xctNiRi0VSuBBW00QIyx-0bg_9bg6Ut4b-7gxsqLsxtKFxXFwrnYynzLnaOpGeandg1BckbA/pub?gid=0&single=true&output=csv";
  console.log("Set CAR_SHEET_CSV environment variable.");
}

const app = express();

// Enable trust proxy for CORS in production behind reverse proxies
app.set("trust proxy", 1);

// Enable CORS allowlist for static origin (Phase 2)
app.use(enforceCorsForStaticOrigin());

// Increase request size limit to handle image uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve static files from the public directory (for favicon and other assets)
app.use(express.static('public'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Health endpoint for Phase 1 - Keep minimal and safe
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Check if response has already been sent
    if (res.headersSent) {
      console.error('Error occurred after response sent:', err.message);
      return; // Don't try to send another response
    }
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({ message });
    // Don't throw the error - this breaks the middleware chain
    console.error('Request error:', err);
  });

  // Phase 2: Remove server-side SPA hosting in production
  // Only serve SPA in development; in production, static deployment handles frontend
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Phase 2: API-only mode - return 404 for non-API paths
    app.use("*", (_req, res) => {
      res.status(404).json({ message: "API endpoint not found. Frontend is served from static deployment." });
    });
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
