import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { runInvestigation } from "./src/server/analyzer.js";

// Supabase client for token verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://lvdlolrklzldqkyijntu.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGxvbHJrbHpsZHFreWlqbnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTYyMjksImV4cCI6MjA5ODYzMjIyOX0.3ychI7oiC9zdatwy6QP8SQTfVI-x6vl4x3NpN53TvBI";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Exempt Admin Emails (Zero rate limit)
const ADMIN_EMAILS = new Set([
  "raigoza.david.j@gmail.com",
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()) : [])
]);

// Rate Limit Constants
const GUEST_LIMIT = 1; // 1 free search for unauthenticated visitors
const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTH_USER_LIMIT = 10; // 10 searches per hour for standard logged in users
const AUTH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-Memory Usage Store
interface UsageRecord {
  count: number;
  resetAt: number;
}
const guestUsageMap = new Map<string, UsageRecord>();
const authUserUsageMap = new Map<string, UsageRecord>();

// Helper to get client IP
function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "127.0.0.1";
}

// Extract & verify user from Bearer token
async function authenticateRequest(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.warn("[Auth] Token verification failed:", err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Endpoint: Query current quota status
  app.get("/api/auth/quota", async (req: express.Request, res: express.Response) => {
    const user = await authenticateRequest(req);
    const ip = getClientIp(req);
    const now = Date.now();

    if (user) {
      const email = user.email?.toLowerCase() || "";
      const isAdmin = ADMIN_EMAILS.has(email);

      if (isAdmin) {
        return res.json({
          used: 0,
          limit: 999999,
          remaining: 999999,
          isUnlimited: true,
          requiresAuth: false,
        });
      }

      const record = authUserUsageMap.get(user.id);
      let used = 0;
      if (record && record.resetAt > now) {
        used = record.count;
      }
      return res.json({
        used,
        limit: AUTH_USER_LIMIT,
        remaining: Math.max(0, AUTH_USER_LIMIT - used),
        isUnlimited: false,
        requiresAuth: false,
      });
    }

    // Guest Status
    const guestRecord = guestUsageMap.get(ip);
    let guestUsed = 0;
    if (guestRecord && guestRecord.resetAt > now) {
      guestUsed = guestRecord.count;
    }

    return res.json({
      used: guestUsed,
      limit: GUEST_LIMIT,
      remaining: Math.max(0, GUEST_LIMIT - guestUsed),
      isUnlimited: false,
      requiresAuth: guestUsed >= GUEST_LIMIT,
    });
  });

  // Analysis endpoint supporting SSE streaming & Rate Limiting
  const analyzeHandler = async (req: express.Request, res: express.Response) => {
    const now = Date.now();
    const user = await authenticateRequest(req);
    const ip = getClientIp(req);

    // ── Check Rate Limits ──
    if (user) {
      const email = user.email?.toLowerCase() || "";
      const isAdmin = ADMIN_EMAILS.has(email);

      if (isAdmin) {
        console.log(`[RateLimit] Admin bypass for ${email}`);
      } else {
        const record = authUserUsageMap.get(user.id);
        if (record && record.resetAt > now) {
          if (record.count >= AUTH_USER_LIMIT) {
            const resetInMinutes = Math.ceil((record.resetAt - now) / 60000);
            return res.status(429).json({
              error: "Hourly search limit reached",
              message: `You have reached your limit of ${AUTH_USER_LIMIT} investigations per hour. Please wait ${resetInMinutes} minutes before starting another investigation.`,
              code: "AUTH_LIMIT_REACHED",
              requiresAuth: false,
            });
          }
          record.count += 1;
        } else {
          authUserUsageMap.set(user.id, { count: 1, resetAt: now + AUTH_WINDOW_MS });
        }
      }
    } else {
      // Guest Rate Limiting: 1 free search
      const guestRecord = guestUsageMap.get(ip);
      if (guestRecord && guestRecord.resetAt > now) {
        if (guestRecord.count >= GUEST_LIMIT) {
          return res.status(429).json({
            error: "Guest search limit reached",
            message: "You have completed your 1 free guest investigation. Please sign in with Google or create a free account to continue.",
            code: "GUEST_LIMIT_REACHED",
            requiresAuth: true,
          });
        }
        guestRecord.count += 1;
      } else {
        guestUsageMap.set(ip, { count: 1, resetAt: now + GUEST_WINDOW_MS });
      }
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

