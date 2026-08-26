import { createClient, type User } from "@supabase/supabase-js";
import type { IncomingMessage } from "http";

// Supabase client for token verification
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "https://lvdlolrklzldqkyijntu.supabase.co";
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZGxvbHJrbHpsZHFreWlqbnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTYyMjksImV4cCI6MjA5ODYzMjIyOX0.3ychI7oiC9zdatwy6QP8SQTfVI-x6vl4x3NpN53TvBI";

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);

// Exempt Admin Emails (Zero rate limit)
export const ADMIN_EMAILS = new Set([
  "raigoza.david.j@gmail.com",
  ...(process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : []),
]);

// Rate Limit Constants
export const GUEST_LIMIT = 1; // 1 free search for unauthenticated visitors
export const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
export const AUTH_USER_LIMIT = 10; // 10 searches per hour for standard logged in users
export const AUTH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface UsageRecord {
  count: number;
  resetAt: number;
}

// In-Memory Usage Stores (persists across warm invocations)
export const guestUsageMap = new Map<string, UsageRecord>();
export const authUserUsageMap = new Map<string, UsageRecord>();

// Helper to get client IP from request headers or socket
export function getClientIp(req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") {
    return realIp.trim();
  }
  return (req as unknown as { socket?: { remoteAddress?: string } }).socket?.remoteAddress || "127.0.0.1";
}

// Extract & verify user from Authorization Bearer token
export async function authenticateRequest(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }
): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.warn("[Auth] Token verification failed:", err);
    return null;
  }
}

export interface QuotaResult {
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  requiresAuth: boolean;
}

export async function getQuotaForRequest(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }
): Promise<QuotaResult> {
  const user = await authenticateRequest(req);
  const ip = getClientIp(req);
  const now = Date.now();

  if (user) {
    const email = user.email?.toLowerCase() || "";
    const isAdmin = ADMIN_EMAILS.has(email);

    if (isAdmin) {
      return {
        used: 0,
        limit: 999999,
        remaining: 999999,
        isUnlimited: true,
        requiresAuth: false,
      };
    }

    const record = authUserUsageMap.get(user.id);
    let used = 0;
    if (record && record.resetAt > now) {
      used = record.count;
    }
    return {
      used,
      limit: AUTH_USER_LIMIT,
      remaining: Math.max(0, AUTH_USER_LIMIT - used),
      isUnlimited: false,
      requiresAuth: false,
    };
  }

  // Guest Status
  const guestRecord = guestUsageMap.get(ip);
  let guestUsed = 0;
  if (guestRecord && guestRecord.resetAt > now) {
    guestUsed = guestRecord.count;
  }

  return {
    used: guestUsed,
    limit: GUEST_LIMIT,
    remaining: Math.max(0, GUEST_LIMIT - guestUsed),
    isUnlimited: false,
    requiresAuth: guestUsed >= GUEST_LIMIT,
  };
}

export interface RateLimitCheckResult {
  allowed: boolean;
  statusCode?: number;
  errorPayload?: {
    error: string;
    message: string;
    code: string;
    requiresAuth: boolean;
  };
  user?: User | null;
}

export async function checkAndConsumeRateLimit(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }
): Promise<RateLimitCheckResult> {
  const now = Date.now();
  const user = await authenticateRequest(req);
  const ip = getClientIp(req);

  if (user) {
    const email = user.email?.toLowerCase() || "";
    const isAdmin = ADMIN_EMAILS.has(email);

    if (isAdmin) {
      console.log(`[RateLimit] Admin bypass for ${email}`);
      return { allowed: true, user };
    }

    const record = authUserUsageMap.get(user.id);
    if (record && record.resetAt > now) {
      if (record.count >= AUTH_USER_LIMIT) {
        const resetInMinutes = Math.ceil((record.resetAt - now) / 60000);
        return {
          allowed: false,
          statusCode: 429,
          errorPayload: {
            error: "Hourly search limit reached",
            message: `You have reached your limit of ${AUTH_USER_LIMIT} investigations per hour. Please wait ${resetInMinutes} minutes before starting another investigation.`,
            code: "AUTH_LIMIT_REACHED",
            requiresAuth: false,
          },
          user,
        };
      }
      record.count += 1;
    } else {
      authUserUsageMap.set(user.id, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    }

    return { allowed: true, user };
  }

  // Guest rate limiting (1 free search)
  const guestRecord = guestUsageMap.get(ip);
  if (guestRecord && guestRecord.resetAt > now) {
    if (guestRecord.count >= GUEST_LIMIT) {
      return {
        allowed: false,
        statusCode: 429,
        errorPayload: {
          error: "Guest search limit reached",
          message:
            "You have completed your 1 free guest investigation. Please sign in with Google or create a free account to continue.",
          code: "GUEST_LIMIT_REACHED",
          requiresAuth: true,
        },
        user: null,
      };
    }
    guestRecord.count += 1;
  } else {
    guestUsageMap.set(ip, { count: 1, resetAt: now + GUEST_WINDOW_MS });
  }

  return { allowed: true, user: null };
}
