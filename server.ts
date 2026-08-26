import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { runInvestigation } from "./src/server/analyzer.js";
import { getQuotaForRequest, checkAndConsumeRateLimit } from "./src/server/auth.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Endpoint: Query current quota status
  app.get("/api/auth/quota", async (req: express.Request, res: express.Response) => {
    try {
      const quota = await getQuotaForRequest(req);
      return res.json(quota);
    } catch (err) {
      console.error("[Server /api/auth/quota Error]", err);
      return res.status(500).json({ error: "Failed to retrieve quota" });
    }
  });

  // Analysis endpoint supporting SSE streaming & Rate Limiting
  const analyzeHandler = async (req: express.Request, res: express.Response) => {
    // Check Rate Limits
    const rateLimitResult = await checkAndConsumeRateLimit(req);
    if (!rateLimitResult.allowed) {
      return res
        .status(rateLimitResult.statusCode || 429)
        .json(rateLimitResult.errorPayload);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const input = req.body || {};
      const report = await runInvestigation(input, (evt) => {
        sendEvent("progress", evt);
      });

      sendEvent("complete", report);
    } catch (err) {
      console.error("[Analyzer Error]", err);
      sendEvent("error", {
        message: err instanceof Error ? err.message : "Analysis failed",
      });
    } finally {
      res.end();
    }
  };

  app.options(["/api/analyze", "/functions/v1/analyze"], cors());
  app.post(["/api/analyze", "/functions/v1/analyze"], analyzeHandler);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();


