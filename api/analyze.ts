import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runInvestigation } from "../src/server/analyzer.js";
import { checkAndConsumeRateLimit } from "../src/server/auth.js";

// Helper to parse body if it comes as a string or buffer
function parseRequestBody(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === "object") {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS Preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  // Rate Limiting Check
  const rateLimitResult = await checkAndConsumeRateLimit(req);
  if (!rateLimitResult.allowed) {
    return res
      .status(rateLimitResult.statusCode || 429)
      .json(rateLimitResult.errorPayload);
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const input = parseRequestBody(req);
    const report = await runInvestigation(input as any, (evt) => {
      sendEvent("progress", evt);
    });

    sendEvent("complete", report);
  } catch (err) {
    console.error("[Vercel /api/analyze Error]", err);
    sendEvent("error", {
      message: err instanceof Error ? err.message : "Analysis failed",
    });
  } finally {
    res.end();
  }
}
