import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ── Configuration ────────────────────────────────────────────

export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const STABILIZATION_THRESHOLD = 0.90;

// Hard Investigation Budgets
export const MAX_ANALYZED_PAGES = 5;
export const MAX_EXTRACTION_INPUT_TOKENS = 1200;
export const MAX_HYPOTHESIS_INPUT_TOKENS = 2500;
export const MAX_FINAL_INPUT_TOKENS = 6000;
export const MAX_EXTRACT_TOKENS = 800;
export const MAX_HYPOTHESIS_TOKENS = 600;
export const MAX_INFERENCE_TOKENS = 3500;

// ── Rate limit / retry configuration ────────────────────────

export const GROQ_MAX_RETRIES = 5;
export const GROQ_TPM_LIMIT = 30_000;
export const GROQ_BACKOFF_BASE = 5000;
export const GROQ_BACKOFF_MAX = 60_000;

// ── Rate-limit bypass ──────────────────────────────────────────
//
// When the RATE_LIMIT_BYPASS_KEY env var is set, any incoming request
// with header `x-rate-limit-bypass` matching this value will bypass all
// rate-limit delays (pre-emptive token budget wait + 429 retry backoff).
// This allows developers to test without waiting during development.
// The value is read from env — never hardcoded.

const BYPASS_KEY = Deno.env.get("RATE_LIMIT_BYPASS_KEY") ?? "";

export function rateLimitBypassActive(requestBypassValue: string | null): boolean {
  return BYPASS_KEY.length > 0 && requestBypassValue === BYPASS_KEY;
}

// Module-level flag: set once per request from the handler so every downstream
// groq() call (including extractEvidence/mergeHypothesis in evidence.ts) sees it.
let _bypassActive = false;
export function setRateLimitBypass(active: boolean): void {
  _bypassActive = active;
}
export function isRateLimitBypassActive(): boolean {
  return _bypassActive;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rate-limit-bypass",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Token budget tracker ─────────────────────────────────────
//
// Maintains a rolling 1-minute window of estimated token usage.
// Before each request, checks if the next call would exceed the
// TPM limit and pre-emptively delays to avoid 429s.

class TokenBudgetTracker {
  private window: { time: number; tokens: number }[] = [];
  private windowMs = 60_000;

  /** Crude prompt token estimate (4 chars ≈ 1 token) */
  estimatePromptTokens(messages: { role: string; content: string }[]): number {
    let total = 0;
    for (const m of messages) total += Math.ceil(m.content.length / 4);
    return total;
  }

  /** If the next call would exceed the TPM budget, return ms to wait. Otherwise 0. */
  getWaitTime(needed: number): number {
    const now = Date.now();
    this.window = this.window.filter((e) => now - e.time < this.windowMs);
    const used = this.window.reduce((s, e) => s + e.tokens, 0);
    if (used + needed >= GROQ_TPM_LIMIT) {
      const oldest = this.window[0]?.time ?? now;
      return Math.max(1000, oldest + this.windowMs - now + 500);
    }
    return 0;
  }

  /** Record actual token usage */
  record(tokens: number): void {
    this.window.push({ time: Date.now(), tokens });
  }

  get currentUsage(): number {
    const now = Date.now();
    this.window = this.window.filter((e) => now - e.time < this.windowMs);
    return this.window.reduce((s, e) => s + e.tokens, 0);
  }
}

export const tokenBudget = new TokenBudgetTracker();

// ── Types ────────────────────────────────────────────────────

export type PageCat
  = "homepage" | "about" | "products" | "case_studies"
  | "customers" | "pricing" | "blog" | "documentation"
  | "careers" | "support" | "legal" | "other";

export interface PageMeta {
  url: string;
  title: string;
  pageType: PageCat;
  priority: number;
}

export interface EvidenceObject {
  pageType: PageCat;
  url: string;
  title: string;
  intendedAudience: string;
  capabilities: string[];
  positioningClaims: string[];
  differentiators: string[];
  credibilitySignals: string[];
  productsMentioned: string[];
  recurringConcepts: string[];
  supportingQuotes: { quote: string; significance: string }[];
  confidence: number; // 0–1 how confident in this extraction
}

// ── Progressive Investigation Types ──────────────────────────

export interface KnownFact {
  area: string;
  detail: string;
}

export interface UnknownArea {
  area: string;
  description: string;
  importance: "high" | "medium" | "low";
}

export interface HypothesisState {
  positionStatement: string;
  known: KnownFact[];
  unknown: UnknownArea[];
  confidence: number; // 0-100 or 0-1
  positionStability?: number; // 0-1 or 0-100
}

/** Calculate hypothesis stability (0.0 to 1.0) separately from confidence & coverage */
export function calculateStability(
  hypothesis: HypothesisState,
  coverage: CategoryCoverage,
  unexaminedSourcesCount: number,
): number {
  const normConf = hypothesis.confidence > 1 ? hypothesis.confidence / 100 : hypothesis.confidence;
  const highPriUnknowns = hypothesis.unknown.filter((u) => u.importance === "high").length;
  const medPriUnknowns = hypothesis.unknown.filter((u) => u.importance === "medium").length;
  const unresolvedCats = coverage.resolutions.filter((r) => r.status === "unresolved").length;

  const totalDiscovered = coverage.sampled + unexaminedSourcesCount;
  const unexaminedRatio = totalDiscovered > 0 ? unexaminedSourcesCount / totalDiscovered : 0;

  // Base stability starts from hypothesis confidence
  let stab = normConf * 0.60;

  // Penalize for high & medium priority unresolved questions
  stab -= highPriUnknowns * 0.12;
  stab -= medPriUnknowns * 0.04;

  // Penalize for unresolved target categories
  stab -= unresolvedCats * 0.08;

  // Penalize proportionally to the fraction of unexamined discovered sources
  // A large unexamined surface area (e.g. 106 unexamined / 111 discovered) reduces stability across the site
  stab -= unexaminedRatio * 0.30;

  // Corroboration bonus if evidence spans 3+ distinct sampled categories
  if (coverage.sampled >= 3) {
    stab += 0.15;
  }

  return Math.min(0.95, Math.max(0.10, Math.round(stab * 100) / 100));
}

// ── Category Resolution & Coverage Types ──────────────────────

export type CategoryStatus = "unresolved" | "sampled" | "not_present" | "skipped";

export interface CategoryResolution {
  category: PageCat;
  status: CategoryStatus;
  /** The URL that received the category's single analysis attempt (null when not present). */
  attemptedUrl: string | null;
  reason: string;
}

export interface CategoryCoverage {
  /** 0-100. Guarded: when Sampled + Skipped === 0 this is 0, never NaN/undefined. */
  coveragePercent: number;
  sampled: number;
  skipped: number;
  notPresent: number;
  total: number;
  resolutions: CategoryResolution[];
}

export interface ProgressEvent {
  type:
    | "site_discovering"
    | "site_discovered"
    | "page_analysis_start"
    | "page_analysis_result"
    | "next_source_selected"
    | "investigation_stopped"
    | "rate_limit_waiting"
    | "building_report"
    | "inference_complete"
    | "complete"
    | "error";
  message: string;
  detail?: Record<string, unknown>;
  pagesDiscovered?: number;
  pagesAnalyzed?: number;
  pagesSkipped?: number;
  totalTokensUsed?: number;
  estimatedTokenSavings?: number;
  currentConfidence?: number;
}

export interface AnalysisInput {
  url?: string;
  documentText?: string;
  fileName?: string;
}

export interface AnalysisMetadata {
  pagesDiscovered: number;
  pagesAnalyzed: number;
  pagesSkipped: number;
  skippedPages: { url: string; category: string; reason: string }[];
  totalTokensUsed: number;
  estimatedTokenSavings: number;
  evidenceEfficiency: number;
  stopReason: string;
  finalConfidence: number;
  positionStability?: number;
  evidenceObjectsCount: number;
  confidenceProgression: { step: number; pageType: string; confidence: number }[];
  coverage: CategoryCoverage;
}

// ── Low-level API call ───────────────────────────────────────
//
// Makes the actual HTTP request to Groq. Does NOT retry — that's
// handled by the exported `groq()` wrapper below.

const GROQ_KEY = Deno.env.get("GROQ_API_KEY") ?? "";

interface GroqResult {
  content: string | null;
  status: number;
  retryAfter: number | null;
  usedTokens: number;
  errorBody: string | null;
}

async function groqRaw(
  messages: { role: string; content: string }[],
  maxT = 2000,
  temp = 0.2,
  bypass = false,
): Promise<GroqResult> {
  const effectiveBypass = bypass || _bypassActive;
  const promptTokens = tokenBudget.estimatePromptTokens(messages);
  const estimatedTotal = promptTokens + (maxT ?? 2000);

  // Pre-emptive token budget check — skip when bypass is active
  if (!effectiveBypass) {
    const waitTime = tokenBudget.getWaitTime(estimatedTotal);
    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }

  const r = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: temp,
      max_tokens: maxT,
    }),
  });

  // Parse Retry-After header (value is seconds as string)
  let retryAfter: number | null = null;
  const retryHeader = r.headers.get("Retry-After");
  if (retryHeader) {
    const parsed = parseInt(retryHeader, 10);
    if (!isNaN(parsed)) retryAfter = parsed * 1000;
  }

  if (!r.ok) {
    let errorBody: string | null = null;
    try {
      errorBody = await r.text();
    } catch {
      // ignore
    }
    return { content: null, status: r.status, retryAfter, usedTokens: estimatedTotal, errorBody };
  }

  const d = await r.json();
  const completionTokens = d.usage?.completion_tokens ?? maxT;
  const actualUsed = promptTokens + completionTokens;
  tokenBudget.record(actualUsed);

  return {
    content: d.choices?.[0]?.message?.content ?? null,
    status: r.status,
    retryAfter,
    usedTokens: actualUsed,
    errorBody: null,
  };
}

// ── Retry‑enabled Groq call (public API) ─────────────────────
//
// Handles 429 rate limits with:
//   - Respecting Retry-After header if provided
//   - Exponential backoff otherwise (base 5s, cap 60s)
//   - Up to GROQ_MAX_RETRIES attempts per call
//   - Progress events so the UI can show "Waiting for reasoning engine…"
//   - Token budget awareness (pre-delay before sending)

export async function groq(
  messages: { role: string; content: string }[],
  maxT = 2000,
  temp = 0.2,
  sendProgress?: (evt: ProgressEvent) => void,
  bypass = false,
): Promise<string | null> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
    const effectiveBypass = bypass || _bypassActive;
    const result = await groqRaw(messages, maxT, temp, effectiveBypass);

    if (result.status === 429) {
      // When bypass is active, retry immediately without backoff — used for
      // development/testing so an analysis is not stalled by rate limiting.
      const delay = effectiveBypass
        ? 0
        : (result.retryAfter ??
          Math.min(GROQ_BACKOFF_BASE * Math.pow(2, attempt), GROQ_BACKOFF_MAX));

      if (delay > 0 && sendProgress) {
        sendProgress({
          type: "rate_limit_waiting",
          message: `The reasoning engine has reached its current capacity. Automatically continuing in ${Math.ceil(delay / 1000)}s\u2026`,
          detail: {
            attempt: attempt + 1,
            maxRetries: GROQ_MAX_RETRIES + 1,
            delayMs: delay,
          },
        });
      }

      if (delay > 0) {
        console.warn(`Groq 429 (attempt ${attempt + 1}/${GROQ_MAX_RETRIES + 1}), waiting ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.warn(`Groq 429 (attempt ${attempt + 1}/${GROQ_MAX_RETRIES + 1}) — bypass active, retrying immediately`);
      }
      lastError = `Rate limited after ${attempt + 1} attempt(s)`;
      continue;
    }

    if (!result.content && result.status !== 200) {
      console.error("Groq non-429 error:", result.status, result.errorBody);
      return null;
    }

    return result.content;
  }

  console.error("Groq exhausted all retries:", lastError);
  return null;
}

// ── Utility helpers ──────────────────────────────────────────

export function parseJ<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(
      raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim(),
    );
  } catch {
    return null;
  }
}

export async function rawFetch(
  url: string,
  timeout = 8000,
): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "CommonGround/1.0 (market position inference; contact@commonground.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(timeout),
    });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

export function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}