import { corsHeaders, parseJ, groq, rateLimitBypassActive, setRateLimitBypass } from "./shared.ts";
import type {
  ProgressEvent,
  AnalysisInput,
  HypothesisState,
  EvidenceObject,
  PageCat,
  CategoryCoverage,
  CategoryResolution,
} from "./shared.ts";
import { STABILIZATION_THRESHOLD, MAX_INFERENCE_TOKENS } from "./shared.ts";
import { discover } from "./crawler.ts";
import type { PageMeta } from "./crawler.ts";
import { extractEvidence, mergeHypothesis, EvidenceStore } from "./evidence.ts";
import { finalReportSysPrompt, buildMetadata } from "./report.ts";

// ── Category resolution constants ─────────────────────────────
//
// Target page categories are resolved in priority order. Each category gets
// AT MOST ONE attempt: it is either Sampled (evidence extracted), Skipped
// (located but unusable), or Not present (no page located via sitemap,
// navigation links, or URL pattern). There is no homepage fallback for
// unresolved categories and no retrying of the same category.

export const SOURCES_EXHAUSTED_STOP = "Stopped — no further sources available";

const TARGET_CATEGORIES: PageCat[] = [
  "homepage",
  "about",
  "products",
  "case_studies",
  "customers",
  "pricing",
  "blog",
  "documentation",
  "careers",
  "support",
  "legal",
  "other",
];

// ── SSE helpers ────────────────────────────────────────────────

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sendProgress(
  controller: ReadableStreamDefaultController,
  evt: ProgressEvent,
) {
  controller.enqueue(new TextEncoder().encode(sse("progress", evt)));
}

// ── Token accounting ──────────────────────────────────────────

interface TokenAccount {
  extractionCalls: number;
  totalExtractionTokens: number;
  inferencePromptTokens: number;
  inferenceCompletionTokens: number;
  hypothesisCalls: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimatedSavings(account: TokenAccount): number {
  const oldWayExtraction = account.extractionCalls * 1200;
  const oldWayFinal = account.inferencePromptTokens;
  const newWay = (account.extractionCalls * 800) + 500 + account.inferenceCompletionTokens;
  return Math.max(0, oldWayExtraction + oldWayFinal - newWay);
}

// ── Build initial hypothesis from homepage evidence ──────────

function initialHypothesis(evidence: EvidenceObject): HypothesisState {
  const unknown: { area: string; description: string; importance: "high" | "medium" | "low" }[] = [];
  const known: { area: string; detail: string }[] = [];

  if (evidence.capabilities.length > 0) {
    known.push({ area: "Core capabilities", detail: evidence.capabilities.slice(0, 4).join(", ") });
  } else {
    unknown.push({ area: "Core capabilities", description: "What does this company actually do?", importance: "high" });
  }

  if (evidence.intendedAudience) {
    known.push({ area: "Intended audience", detail: evidence.intendedAudience });
  } else {
    unknown.push({ area: "Intended audience", description: "Who is this for?", importance: "high" });
  }

  if (evidence.positioningClaims.length > 0) {
    known.push({ area: "Positioning claims", detail: evidence.positioningClaims.slice(0, 3).join("; ") });
  } else {
    unknown.push({ area: "Positioning claims", description: "What market position is claimed?", importance: "high" });
  }

  if (evidence.differentiators.length > 0) {
    known.push({ area: "Differentiators", detail: evidence.differentiators.slice(0, 3).join(", ") });
  } else {
    unknown.push({ area: "Competitive differentiation", description: "What makes them different?", importance: "high" });
  }

  if (evidence.productsMentioned.length > 0) {
    known.push({ area: "Products", detail: evidence.productsMentioned.slice(0, 3).join(", ") });
  }

  if (evidence.credibilitySignals.length > 0) {
    known.push({ area: "Credibility signals", detail: evidence.credibilitySignals.slice(0, 3).join(", ") });
  } else {
    unknown.push({ area: "Customer proof", description: "Do they have real customers or case studies?", importance: "medium" });
  }

  // Position statement derived from homepage
  const positionParts: string[] = [];
  if (evidence.intendedAudience) positionParts.push(`for ${evidence.intendedAudience}`);
  if (evidence.capabilities.length > 0) positionParts.push(`who ${evidence.capabilities.slice(0, 2).join(" and ")}`);
  if (evidence.differentiators.length > 0) positionParts.push(`differentiated by ${evidence.differentiators.slice(0, 2).join(", ")}`);
  const positionStatement = positionParts.length > 0
    ? `A company ${positionParts.join(", ")}.`
    : "Market position unclear from homepage alone.";

  return {
    positionStatement,
    known,
    unknown,
    confidence: Math.round(evidence.confidence * 65), // scale extraction confidence to ~45-65 range
  };
}

// ── Direct analysis (documentText path — unchanged) ──────────

async function analyzeDirect(
  text: string,
  fileName: string,
  srcUrl: string,
  controller: ReadableStreamDefaultController,
): Promise<Record<string, unknown>> {
  sendProgress(controller, {
    type: "building_report",
    message: "Analyzing document content…",
  });

  const raw = await groq(
    [
      { role: "system", content: finalReportSysPrompt() },
      {
        role: "user",
        content:
          `Analyze this organization's market position.\n\nSource: ${fileName || srcUrl || "Document"}\n\nContent:\n${text.slice(0, 8000)}`,
      },
    ],
    MAX_INFERENCE_TOKENS,
    0.2,
    (evt) => sendProgress(controller, evt),
  );

  const report = parseJ<Record<string, unknown>>(raw);
  if (!report) throw new Error("Failed to parse analysis results");
  if (!report.analyzedAt) report.analyzedAt = new Date().toISOString();
  report.url = srcUrl;

  return report;
}

// ── Confidence cap for limited coverage ───────────────────────
//
// When the investigation stops because sources are exhausted (not because
// confidence was reached), the reported confidence must reflect the genuinely
// limited evidence. Low coverage → low confidence ceiling (30% at 0% coverage
// up to 90% at 100% coverage). Never raises confidence.

function capConfidenceForCoverage(confidence: number, coveragePercent: number): number {
  const cap = Math.round(30 + (coveragePercent / 100) * 60);
  return Math.min(confidence, cap);
}

// ── Deterministic fallback report ─────────────────────────────
//
// Final synthesis must never fail when data is partial or incomplete: if the
// LLM report cannot be generated/parsed, produce an honest low-confidence
// report from the hypothesis and evidence we do have.

function buildFallbackReport(opts: {
  url: string;
  hypothesis: HypothesisState;
  store: EvidenceStore;
  coverage: CategoryCoverage;
  stopReason: string;
}): Record<string, unknown> {
  const { url, hypothesis, store, coverage, stopReason } = opts;
  const evidence = store.getAll();
  const confidence = Math.round(hypothesis.confidence);
  const baseStatement = hypothesis.positionStatement === "Not yet analyzed."
    ? "Insufficient evidence to determine a market position."
    : hypothesis.positionStatement;
  const notPresentCats = coverage.resolutions
    .filter((r) => r.status === "not_present")
    .map((r) => r.category)
    .join(", ");

  return {
    id: crypto.randomUUID(),
    url,
    title: url,
    analyzedAt: new Date().toISOString(),
    overallScore: confidence >= 70 ? "medium" : "low",
    sourceCitations: evidence
      .filter((ev) => ev.positioningClaims.length > 0 || ev.intendedAudience)
      .map((ev) => ({
        url: ev.url,
        title: ev.title,
        snippet: ev.positioningClaims[0] ?? ev.intendedAudience ?? "",
      })),
    intendedPosition: {
      description: baseStatement,
      rationale: `Inferred from ${evidence.length} sampled page(s) at ${coverage.coveragePercent}% category coverage.`,
    },
    inferredPosition: {
      description: baseStatement,
      rationale: "Inferred from available evidence; limited coverage reduces certainty.",
    },
    earnedPosition: {
      outcome: "not_yet_earned",
      explanation: "Insufficient evidence to determine whether the claimed position is earned.",
    },
    marketSpace: {
      primary: {
        space: "Undetermined",
        rationale: "Not enough evidence to classify the market space confidently.",
      },
    },
    positionSummary: baseStatement,
    positioningSignals: [],
    positioningClarity: {
      overallAssessment: "Insufficient evidence for a confident assessment.",
      items: [
        {
          question: "What does this company do?",
          clarity: hypothesis.known.length > 0 ? "implicit" : "missing",
          explanation: "Not enough on-site evidence to answer confidently.",
        },
        { question: "Who is it for?", clarity: "missing", explanation: "No audience evidence was located." },
        { question: "What problem does it solve?", clarity: "missing", explanation: "No problem-framing evidence was located." },
        { question: "What category does it belong to?", clarity: "missing", explanation: "Category could not be established from available pages." },
        { question: "Why choose this instead of another?", clarity: "missing", explanation: "No differentiation evidence was located." },
      ],
    },
    positioningGaps: [
      {
        area: "Evidence coverage",
        description: `Only ${coverage.coveragePercent}% of page categories were sampled. Categories not located: ${notPresentCats || "none"}.`,
        impact: "significant",
        gapType: "missing_evidence",
      },
    ],
    visitorJourney: evidence.map((ev) => ({
      stage: ev.pageType,
      effect: "neutral",
      explanation: "Insufficient evidence to assess this page's effect on positioning.",
    })),
    positioningRecommendations: [
      {
        priority: "high",
        action: "Make core positioning evidence (about, products, pricing, customers) accessible on the site.",
        rationale: `Coverage was limited to ${coverage.sampled} of ${coverage.total} categories (${coverage.coveragePercent}%).`,
        category: "coherence",
        observationChain: {
          observation: `Investigation stopped: ${stopReason}`,
          inference: "Additional page categories would strengthen the position assessment.",
        },
      },
    ],
    finalQuestion: "Cannot be determined from the available evidence.",
  };
}

// ── Progressive Investigation (URL path — category resolution) ─

async function investigate(
  url: string,
  controller: ReadableStreamDefaultController,
): Promise<Record<string, unknown>> {
  // ── Step 1: Site Discovery ───────────────────────────────
  sendProgress(controller, {
    type: "site_discovering",
    message: "Discovering site structure…",
  });

  const pages: PageMeta[] = await discover(url);
  if (pages.length === 0) throw new Error("No pages discovered at this URL");

  sendProgress(controller, {
    type: "site_discovered",
    message: `Discovered ${pages.length} pages`,
    detail: {
      pages: pages.map((p) => ({
        url: p.url,
        type: p.pageType,
        priority: p.priority,
      })),
    },
    pagesDiscovered: pages.length,
  });

  // ── Category resolution state ────────────────────────────
  const resolutions = new Map<PageCat, CategoryResolution>();
  for (const cat of TARGET_CATEGORIES) {
    resolutions.set(cat, {
      category: cat,
      status: "unresolved",
      attemptedUrl: null,
      reason: "",
    });
  }

  const byCategory = new Map<PageCat, PageMeta[]>();
  for (const p of pages) {
    const list = byCategory.get(p.pageType) ?? [];
    list.push(p);
    byCategory.set(p.pageType, list);
  }

  // Work queue: initially the discovered pages; grows with links found while
  // sampling. Links are deduped by URL so no page is analyzed twice.
  const seenUrls = new Set<string>();
  const queue: PageMeta[] = [];
  for (const p of pages) {
    if (seenUrls.has(p.url)) continue;
    seenUrls.add(p.url);
    queue.push(p);
  }

  const store = new EvidenceStore();
  const examined: { page: PageMeta; evidence: EvidenceObject }[] = [];
  const skipped: { url: string; category: string; reason: string }[] = [];
  const tokenAccount: TokenAccount = {
    extractionCalls: 0,
    hypothesisCalls: 0,
    totalExtractionTokens: 0,
    inferencePromptTokens: 0,
    inferenceCompletionTokens: 0,
  };

  let hypothesis: HypothesisState = {
    positionStatement: "Not yet analyzed.",
    known: [],
    unknown: [{ area: "Everything", description: "No pages analyzed yet", importance: "high" }],
    confidence: 0,
  };

  const confidenceProgression: { step: number; pageType: string; confidence: number }[] = [];
  let stopReason = "Investigation complete";
  let stoppedByExhaustion = false;
  let stepNumber = 0;

  // Re-analysis guard: URL → number of analyses, and whether the last one
  // produced any change to the hypothesis or evidence set.
  const urlAnalysisCount = new Map<string, number>();
  const urlLastAnalysisChanged = new Map<string, boolean>();

  // ── Step 2: Category resolution loop ─────────────────────
  while (true) {
    // Independent stop condition #1 (separate from the confidence threshold):
    // all target categories are resolved (each is Sampled, Not present, or
    // Skipped) AND no newly discovered links remain unqueued.
    const allResolved = [...resolutions.values()].every((r) => r.status !== "unresolved");
    if (allResolved && queue.length === 0) {
      stopReason = SOURCES_EXHAUSTED_STOP;
      stoppedByExhaustion = true;
      break;
    }

    // Confidence threshold — an early-stop optimization for sites with
    // abundant evidence, NOT a required condition for finishing.
    if (hypothesis.confidence >= STABILIZATION_THRESHOLD * 100) {
      stopReason = `Confidence reached ${Math.round(hypothesis.confidence)}% — position stabilized.`;
      break;
    }

    // Pick the next candidate: first unresolved category (in priority order)
    // that has an available page in the queue. Each category is attempted at
    // most once — after this pick it becomes Sampled or Skipped.
    let next: PageMeta | null = null;
    for (const cat of TARGET_CATEGORIES) {
      const res = resolutions.get(cat)!;
      if (res.status !== "unresolved") continue;
      const idx = queue.findIndex((p) => p.pageType === cat);
      if (idx >= 0) {
        next = queue.splice(idx, 1)[0];
        break;
      }
    }

    if (!next) {
      // No unresolved category has a located page. Discard leftover links for
      // already-resolved categories (single-attempt rule, no retries) and mark
      // anything still unresolved as "Not present" — the investigation moves on.
      queue.length = 0;
      for (const res of resolutions.values()) {
        if (res.status === "unresolved") {
          res.status = "not_present";
          res.reason = "No page located via sitemap, navigation links, or URL pattern";
        }
      }
      continue; // next iteration hits stop condition #1
    }

    // Independent stop condition #2: the same page has been re-analyzed more
    // than once with no new information extracted. (Defensive — URL dedup
    // normally prevents re-analysis entirely.)
    const prevCount = urlAnalysisCount.get(next.url) ?? 0;
    const prevChanged = urlLastAnalysisChanged.get(next.url) ?? false;
    if (prevCount >= 1 && !prevChanged) {
      stopReason = SOURCES_EXHAUSTED_STOP;
      stoppedByExhaustion = true;
      break;
    }

    const res = resolutions.get(next.pageType)!;
    res.attemptedUrl = next.url;

    stepNumber++;
    sendProgress(controller, {
      type: "next_source_selected",
      message: `Resolving ${next.pageType}…`,
      detail: {
        pageType: next.pageType,
        url: next.url,
        title: next.title,
        reason: "Category located — single attempt",
        expectedBenefit: "resolve this page category",
        confidenceGain: 5,
      },
      pagesAnalyzed: examined.length,
      pagesDiscovered: pages.length,
      pagesSkipped: skipped.length,
      currentConfidence: hypothesis.confidence,
    });

    sendProgress(controller, {
      type: "page_analysis_start",
      message: `Analyzing ${next.pageType}…`,
      detail: { url: next.url, pageType: next.pageType, step: stepNumber },
      pagesAnalyzed: examined.length,
      pagesDiscovered: pages.length,
      pagesSkipped: skipped.length,
    });

    const newLinks: PageMeta[] = [];
    const evidence = await extractEvidence(
      next.url,
      next.pageType,
      next.title,
      (evt) => sendProgress(controller, evt),
      (links) => newLinks.push(...links),
    );

    const isFirstSample = examined.length === 0;

    if (evidence && evidence.confidence > 0) {
      store.add(evidence);
      examined.push({ page: next, evidence });
      tokenAccount.extractionCalls++;

      if (isFirstSample) {
        hypothesis = initialHypothesis(evidence);
      } else {
        hypothesis = await mergeHypothesis(hypothesis, evidence, (evt) => sendProgress(controller, evt));
        tokenAccount.hypothesisCalls++;
      }

      confidenceProgression.push({
        step: stepNumber,
        pageType: next.pageType,
        confidence: hypothesis.confidence,
      });

      res.status = "sampled";
      res.reason = "Page located and sampled";
      urlLastAnalysisChanged.set(next.url, true);

      sendProgress(controller, {
        type: "page_analysis_result",
        message: `${next.pageType} sampled — ${hypothesis.confidence}% confidence`,
        detail: {
          step: stepNumber,
          pageType: next.pageType,
          url: next.url,
          hypothesis: {
            positionStatement: hypothesis.positionStatement,
            known: hypothesis.known,
            unknown: hypothesis.unknown,
            confidence: hypothesis.confidence,
          },
        },
        pagesAnalyzed: examined.length,
        pagesDiscovered: pages.length,
        pagesSkipped: skipped.length,
        currentConfidence: hypothesis.confidence,
      });
    } else {
      skipped.push({
        url: next.url,
        category: next.pageType,
        reason: "located but no meaningful content extracted",
      });
      res.status = "skipped";
      res.reason = "Located but no meaningful content could be extracted";
      urlLastAnalysisChanged.set(next.url, false);

      sendProgress(controller, {
        type: "page_analysis_result",
        message: `${next.pageType} skipped — no usable content`,
        detail: {
          step: stepNumber,
          pageType: next.pageType,
          url: next.url,
          hypothesis: {
            positionStatement: hypothesis.positionStatement,
            known: hypothesis.known,
            unknown: hypothesis.unknown,
            confidence: hypothesis.confidence,
          },
        },
        pagesAnalyzed: examined.length,
        pagesDiscovered: pages.length,
        pagesSkipped: skipped.length,
        currentConfidence: hypothesis.confidence,
      });
    }

    urlAnalysisCount.set(next.url, prevCount + 1);

    // Queue newly discovered links from the sampled page.
    for (const link of newLinks) {
      if (seenUrls.has(link.url)) continue;
      seenUrls.add(link.url);
      queue.push(link);
    }
  }

  // ── Coverage ──────────────────────────────────────────────
  const sampledCount = [...resolutions.values()].filter((r) => r.status === "sampled").length;
  const skippedCount = [...resolutions.values()].filter((r) => r.status === "skipped").length;
  const notPresentCount = [...resolutions.values()].filter((r) => r.status === "not_present").length;
  const totalCategories = TARGET_CATEGORIES.length;

  // Guard: when Sampled + Skipped = 0 (e.g. everything came back "Not
  // present"), Coverage is 0% — never a division by zero or undefined value.
  const coverage: CategoryCoverage = {
    coveragePercent: 0, // recomputed with guard inside buildMetadata
    sampled: sampledCount,
    skipped: skippedCount,
    notPresent: notPresentCount,
    total: totalCategories,
    resolutions: [...resolutions.values()].map((r) => ({
      category: r.category,
      status: r.status,
      attemptedUrl: r.attemptedUrl,
      reason: r.reason,
    })),
  };

  // When stopping under the exhaustion condition (not the confidence
  // threshold), Coverage and Confidence must reflect the genuinely limited
  // evidence (low for a single-page site) rather than blocking the report.
  if (stoppedByExhaustion) {
    const resolvedForCoverage = sampledCount + skippedCount;
    const guardCoverage = totalCategories === 0 || resolvedForCoverage === 0
      ? 0
      : Math.round((resolvedForCoverage / totalCategories) * 100);
    hypothesis.confidence = capConfidenceForCoverage(hypothesis.confidence, guardCoverage);
  }

  // Notify investigation stopped
  sendProgress(controller, {
    type: "investigation_stopped",
    message: stopReason,
    detail: {
      pagesAnalyzed: examined.length,
      pagesDiscovered: pages.length,
      pagesSkipped: skipped.length,
      finalConfidence: hypothesis.confidence,
      confidenceProgression,
      coverage,
    },
    pagesAnalyzed: examined.length,
    pagesDiscovered: pages.length,
    pagesSkipped: skipped.length,
    currentConfidence: hypothesis.confidence,
  });

  // ── Final Report Synthesis ────────────────────────────────
  sendProgress(controller, {
    type: "building_report",
    message: "Synthesizing final market position report…",
    pagesAnalyzed: examined.length,
    pagesDiscovered: pages.length,
    pagesSkipped: skipped.length,
  });

  const compressedEvidence = store.toCompressedSummary();
  tokenAccount.inferencePromptTokens = estimateTokens(
    finalReportSysPrompt() + compressedEvidence,
  );

  const finalContent = await groq(
    [
      { role: "system", content: finalReportSysPrompt() },
      {
        role: "user",
        content:
          `URL: ${url}\n` +
          `Pages analyzed: ${examined.length}\n` +
          `Category coverage: ${coverage.coveragePercent}% (${coverage.sampled} sampled, ${coverage.skipped} skipped, ${coverage.notPresent} not present of ${coverage.total})\n` +
          `Stopped: ${stopReason}\n` +
          `Final hypothesis confidence: ${Math.round(hypothesis.confidence)}%\n` +
          `Known: ${hypothesis.known.map((k) => `${k.area}: ${k.detail}`).join(" | ")}\n` +
          `Remaining unknowns: ${hypothesis.unknown.map((u) => `${u.area} (${u.importance})`).join(", ") || "None"}\n` +
          `Confidence progression: ${confidenceProgression.map((c) => `${c.pageType}=${c.confidence}%`).join(" → ")}\n\n` +
          `Evidence Objects:\n${compressedEvidence}\n\n` +
          `Produce the full report JSON.`,
      },
    ],
    MAX_INFERENCE_TOKENS,
    0.2,
    (evt) => sendProgress(controller, evt),
  );

  tokenAccount.inferenceCompletionTokens = estimateTokens(finalContent ?? "");

  // Partial/low data must never block report generation: fall back to a
  // deterministic low-confidence report if the LLM synthesis fails.
  const parsedReport = parseJ<Record<string, unknown>>(finalContent);
  const report = parsedReport ?? buildFallbackReport({
    url,
    hypothesis,
    store,
    coverage,
    stopReason,
  });
  if (!parsedReport) {
    console.warn("Final report synthesis failed to parse; using deterministic fallback report.");
  }

  // ── Build metadata ──────────────────────────────────────────
  const meta = buildMetadata(
    pages.length,
    examined.length,
    skipped.length,
    skipped,
    tokenAccount.totalExtractionTokens + tokenAccount.inferencePromptTokens +
      tokenAccount.inferenceCompletionTokens,
    store.count,
    stopReason,
    hypothesis.confidence / 100,
    estimatedSavings(tokenAccount),
    confidenceProgression,
    coverage,
  );

  report.analyzedAt = new Date().toISOString();
  report.url = url;
  report.analysisMetadata = meta;

  // Send progress notification
  sendProgress(controller, {
    type: "inference_complete",
    message: "Report generated",
  });

  return report;
}

// ── Main handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Developer bypass: requests carrying header `x-rate-limit-bypass` matching
  // the RATE_LIMIT_BYPASS_KEY secret skip all rate-limit delays. The flag is
  // set per-request so every downstream groq() call honors it.
  setRateLimitBypass(rateLimitBypassActive(req.headers.get("x-rate-limit-bypass")));

  const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const input: AnalysisInput = await req.json();
  const { url, documentText, fileName } = input;

  if (!documentText && !url) {
    return new Response(
      JSON.stringify({ error: "Provide a URL or document text to analyze." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const body = new ReadableStream({
    async start(controller) {
      try {
        let report: Record<string, unknown>;

        if (documentText && documentText.trim().length >= 50) {
          report = await analyzeDirect(
            documentText,
            fileName || "Document",
            url || "",
            controller,
          );
        } else if (url) {
          report = await investigate(url, controller);
        } else {
          throw new Error("Provide a URL or document text to analyze.");
        }

        controller.enqueue(
          new TextEncoder().encode(sse("complete", report)),
        );
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode(
            sse("error", {
              message: err instanceof Error
                ? err.message
                : "Internal server error",
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  });
});
