import { corsHeaders, parseJ, groq, rateLimitBypassActive, setRateLimitBypass, calculateStability } from "./shared.ts";
import type {
  ProgressEvent,
  AnalysisInput,
  HypothesisState,
  EvidenceObject,
  PageCat,
  CategoryCoverage,
  CategoryResolution,
} from "./shared.ts";
import { STABILIZATION_THRESHOLD, MAX_INFERENCE_TOKENS, MAX_ANALYZED_PAGES } from "./shared.ts";
import { discover } from "./crawler.ts";
import type { PageMeta } from "./crawler.ts";
import { extractEvidence, mergeHypothesisLocal, EvidenceStore, validateProvenance } from "./evidence.ts";
import { finalReportSysPrompt, buildMetadata } from "./report.ts";

export const SOURCES_EXHAUSTED_STOP = "Stopped — no further sources available";

const TARGET_CATEGORIES: PageCat[] = [
  "homepage",
  "products",
  "about",
  "case_studies",
  "customers",
  "pricing",
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
  extractionInputTokens: number;
  extractionOutputTokens: number;
  hypothesisInputTokens: number;
  hypothesisOutputTokens: number;
  finalReportInputTokens: number;
  finalReportOutputTokens: number;
  totalEstimatedTokens: number;
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

  if (evidence.productsMentioned.length > 0) {
    known.push({ area: "Products", detail: evidence.productsMentioned.slice(0, 4).join(", ") });
  }

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

  if (evidence.credibilitySignals.length > 0) {
    known.push({ area: "Credibility signals", detail: evidence.credibilitySignals.slice(0, 3).join(", ") });
  } else {
    unknown.push({ area: "Customer proof", description: "Do they have real customers or case studies?", importance: "medium" });
  }

  // Grounded position statement derived strictly from observed homepage evidence
  const titlePart = evidence.title && evidence.title !== "Home" ? evidence.title : "";
  const subjectName = titlePart || "The subject";

  const prods = evidence.productsMentioned.slice(0, 3).join(", ");
  const caps = evidence.capabilities.slice(0, 3).join(", ");

  const parts: string[] = [];
  if (prods) parts.push(`offering ${prods}`);
  if (caps) parts.push(`providing ${caps}`);
  if (evidence.intendedAudience) parts.push(`targeting ${evidence.intendedAudience}`);
  if (evidence.differentiators.length > 0) parts.push(`differentiated by ${evidence.differentiators[0]}`);

  const cleanClaim = evidence.positioningClaims[0]
    ? evidence.positioningClaims[0].replace(/^["']+|["']+$|=== SOURCE:[^=]+===|Title:[^\n]+/g, "").trim()
    : "";

  const positionStatement = parts.length > 0
    ? `${subjectName} positions as ${parts.join(", ")}, based on initial homepage evidence.`
    : cleanClaim
    ? `${subjectName} positions around ${cleanClaim}, derived from initial homepage evidence.`
    : `${subjectName} presents initial landing copy without explicit capability or audience claims.`;

  return {
    positionStatement,
    known,
    unknown,
    confidence: Math.min(0.65, Math.max(0.35, Math.round((evidence.confidence ?? 0.5) * 65) / 100)),
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
  const normConf = confidence > 1 ? confidence / 100 : confidence;
  const cap = 0.30 + (coveragePercent / 100) * 0.50; // 0.30 to 0.80 cap
  return Math.min(normConf, cap);
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
  const normConf = hypothesis.confidence > 1 ? hypothesis.confidence / 100 : hypothesis.confidence;
  const baseStatement = hypothesis.positionStatement === "Not yet analyzed."
    ? "Insufficient evidence to determine a market position."
    : hypothesis.positionStatement;

  const prods = hypothesis.known.find((k) => k.area.toLowerCase() === "products")?.detail;
  const caps = hypothesis.known.find((k) => k.area.toLowerCase().includes("capabilities"))?.detail;
  const audience = hypothesis.known.find((k) => k.area.toLowerCase().includes("audience"))?.detail;
  const diffs = hypothesis.known.find((k) => k.area.toLowerCase().includes("differentiators"))?.detail;

  const inferredMarketSpace = prods
    ? `${prods.split(",")[0].trim()}`
    : caps
    ? `${caps.split(",")[0].trim()}`
    : "Insufficient evidence to classify";

  const isBudgetExhausted = stopReason.toLowerCase().includes("budget");
  const stopRationale = isBudgetExhausted
    ? `Investigation paused at analysis budget (${coverage.sampled} target categories sampled). Additional discovered sources could materially expand or alter positioning.`
    : `Investigation complete: All available relevant discovered sources examined.`;

  return {
    id: crypto.randomUUID(),
    url,
    title: url,
    analyzedAt: new Date().toISOString(),
    overallScore: normConf >= 0.70 ? "medium" : "low",
    sourceCitations: evidence
      .filter((ev) => ev.positioningClaims.length > 0 || ev.intendedAudience || ev.productsMentioned.length > 0)
      .map((ev) => ({
        url: ev.url,
        title: ev.title,
        snippet: ev.positioningClaims[0] ?? ev.intendedAudience ?? ev.productsMentioned.join(", ") ?? "",
      })),
    intendedPosition: {
      description: baseStatement,
      rationale: stopRationale,
    },
    inferredPosition: {
      description: baseStatement,
      rationale: "Grounded inference derived from multi-page sampled evidence.",
    },
    earnedPosition: {
      outcome: normConf >= 0.70 ? "partially_earned" : "weakly_earned",
      explanation: `Sampled evidence provides ${normConf >= 0.70 ? "moderate" : "limited"} proof for claimed capabilities.`,
    },
    marketSpace: {
      primary: {
        space: inferredMarketSpace,
        rationale: prods || caps ? `Inferred from observed offerings: ${prods || caps}` : "Insufficient evidence to classify market space.",
      },
    },
    positionSummary: baseStatement,
    positioningSignals: hypothesis.known.map((k, i) => ({
      id: `signal-${i + 1}`,
      signal: k.detail,
      signalType: k.area.toLowerCase().includes("diff") ? "differentiation" : k.area.toLowerCase().includes("cred") ? "credibility" : "capability",
      confidence: Math.round(normConf * 100),
      overallScore: normConf >= 0.70 ? "high" : "medium",
      category: k.area,
      reasoningNote: `Observed on sampled site content`,
      contributesToPosition: k.detail,
      evidence: evidence.slice(0, 1).map((ev) => ({
        source: ev.title || ev.url,
        excerpt: ev.positioningClaims[0] || k.detail,
        supportsClaim: true,
        relevance: Math.round(normConf * 100),
      })),
    })),
    positioningClarity: {
      overallAssessment: normConf >= 0.65 ? "Grounded evidence collected across sampled pages." : "Limited evidence available.",
      items: [
        {
          question: "What does this company do?",
          clarity: prods || caps ? "explicit" : "missing",
          explanation: prods || caps ? `Offers ${prods || caps}.` : "Not enough on-site evidence to answer confidently.",
        },
        {
          question: "Who is it for?",
          clarity: audience ? "explicit" : "missing",
          explanation: audience ? `Aimed at ${audience}.` : "Audience could not be established from the evidence examined.",
        },
        {
          question: "What problem does it solve?",
          clarity: caps ? "implicit" : "missing",
          explanation: caps ? `Addresses needs via ${caps}.` : "No problem-framing evidence was located.",
        },
        {
          question: "What category does it belong to?",
          clarity: prods || caps ? "implicit" : "missing",
          explanation: inferredMarketSpace,
        },
        {
          question: "Why choose this instead of another?",
          clarity: diffs ? "explicit" : "missing",
          explanation: diffs ? `Differentiated by ${diffs}.` : "No explicit comparative differentiators located.",
        },
      ],
    },
    positioningGaps: [
      {
        area: "Evidence coverage",
        description: `Sampled ${coverage.sampled} of ${coverage.total} target categories (${coverage.coveragePercent}%).`,
        impact: "moderate",
        gapType: "missing_evidence",
      },
    ],
    visitorJourney: evidence.map((ev) => ({
      stage: ev.pageType,
      effect: "strengthens_position",
      explanation: `Provided evidence on ${ev.pageType}: ${ev.title}`,
    })),
    positioningRecommendations: [
      {
        priority: "medium",
        action: audience ? "Make explicit competitive differentiators visible." : "Clarify primary target audience and specific business outcomes.",
        rationale: stopRationale,
        category: "clarity",
        observationChain: {
          observation: `Sampled ${coverage.sampled} pages (${coverage.coveragePercent}% coverage).`,
          inference: "Explicit evidence on unresolved dimensions strengthens positioning clarity.",
        },
      },
    ],
    finalQuestion: diffs
      ? `Based on the evidence examined, the strongest differentiating signal observed is ${diffs}.`
      : "No defensible differentiation can be established from the evidence sampled.",
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
    extractionInputTokens: 0,
    extractionOutputTokens: 0,
    hypothesisInputTokens: 0,
    hypothesisOutputTokens: 0,
    finalReportInputTokens: 0,
    finalReportOutputTokens: 0,
    totalEstimatedTokens: 0,
  };

  let hypothesis: HypothesisState = {
    positionStatement: "Not yet analyzed.",
    known: [],
    unknown: [{ area: "Everything", description: "No pages analyzed yet", importance: "high" }],
    confidence: 0,
  };

  const confidenceProgression: { step: number; pageType: string; confidence: number }[] = [];
  let stopReason = "Investigation complete";
  let stopReasonCode: "hypothesis_stable" | "evidence_exhausted" | "budget_exhausted" | "blocked" = "evidence_exhausted";
  let stoppedByExhaustion = false;
  let stepNumber = 0;

  // Re-analysis guard
  const urlAnalysisCount = new Map<string, number>();
  const urlLastAnalysisChanged = new Map<string, boolean>();

  // ── Step 2: Category resolution loop ─────────────────────
  while (true) {
    // Current coverage estimation for stability check
    const sampledSoFar = [...resolutions.values()].filter((r) => r.status === "sampled").length;
    const skippedSoFar = [...resolutions.values()].filter((r) => r.status === "skipped").length;
    const notPresentSoFar = [...resolutions.values()].filter((r) => r.status === "not_present").length;
    const coverageSoFar: CategoryCoverage = {
      coveragePercent: Math.round(((sampledSoFar + skippedSoFar) / TARGET_CATEGORIES.length) * 100),
      sampled: sampledSoFar,
      skipped: skippedSoFar,
      notPresent: notPresentSoFar,
      total: TARGET_CATEGORIES.length,
      resolutions: [...resolutions.values()].map((r) => ({
        category: r.category,
        status: r.status,
        attemptedUrl: r.attemptedUrl,
        reason: r.reason,
      })),
    };

    const currentStability = calculateStability(hypothesis, coverageSoFar, queue.length);
    hypothesis.positionStability = currentStability;

    // Enforce hard maximum analyzed pages limit (max 5)
    if (examined.length >= MAX_ANALYZED_PAGES) {
      stopReasonCode = "budget_exhausted";
      const unresolvedCatCount = [...resolutions.values()].filter((r) => r.status === "unresolved").length;
      stopReason = `Reached maximum page limit (${MAX_ANALYZED_PAGES} pages sampled). Investigation stopped by budget limit while ${unresolvedCatCount} category/categories remain unresolved.`;
      break;
    }

    // Stop condition #1: all target categories resolved and queue empty
    const allResolved = [...resolutions.values()].every((r) => r.status !== "unresolved");
    if (allResolved && queue.length === 0) {
      stopReasonCode = "evidence_exhausted";
      stopReason = SOURCES_EXHAUSTED_STOP;
      stoppedByExhaustion = true;
      break;
    }

    // Stop condition #2: true stability threshold (requires stability >= 0.85 AND no high-pri unresolved questions)
    if (currentStability >= 0.85) {
      const unresolvedHighPri = hypothesis.unknown.filter((u) => u.importance === "high");
      if (unresolvedHighPri.length === 0) {
        stopReasonCode = "hypothesis_stable";
        stopReason = `Hypothesis reached ${Math.round(currentStability * 100)}% stability with no remaining high-priority unresolved questions — position stabilized.`;
        break;
      }
    }

    // Smart Planner Candidate Selection: Score queued pages based on unresolved high-priority questions
    let next: PageMeta | null = null;
    if (queue.length > 0) {
      const highPriAreas = new Set(
        hypothesis.unknown
          .filter((u) => u.importance === "high")
          .map((u) => u.area.toLowerCase()),
      );
      const unresolvedCats = new Set(
        [...resolutions.values()]
          .filter((r) => r.status === "unresolved")
          .map((r) => r.category),
      );

      let bestIdx = -1;
      let bestScore = -1000;

      for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        let score = p.priority ?? 10;

        // Unresolved category match bonus
        if (unresolvedCats.has(p.pageType)) {
          score += 40;
        }

        // Question/Uncertainty match bonuses
        const cat = p.pageType;
        const urlLower = p.url.toLowerCase();

        if (
          (cat === "pricing" || urlLower.includes("pricing") || urlLower.includes("billing") || urlLower.includes("plans")) &&
          (highPriAreas.has("commercial model") || highPriAreas.has("pricing") || highPriAreas.has("everything"))
        ) {
          score += 60;
        }
        if (
          (cat === "customers" || cat === "case_studies" || urlLower.includes("customer") || urlLower.includes("case-stud") || urlLower.includes("enterprise") || urlLower.includes("stories")) &&
          (highPriAreas.has("intended audience") || highPriAreas.has("customer proof") || highPriAreas.has("credibility") || highPriAreas.has("everything"))
        ) {
          score += 60;
        }
        if (
          (cat === "products" || urlLower.includes("product") || urlLower.includes("feature") || urlLower.includes("solution") || urlLower.includes("platform")) &&
          (highPriAreas.has("core capabilities") || highPriAreas.has("products") || highPriAreas.has("differentiators") || highPriAreas.has("everything"))
        ) {
          score += 60;
        }
        if (
          (cat === "about" || urlLower.includes("about") || urlLower.includes("company")) &&
          (highPriAreas.has("company identity") || highPriAreas.has("positioning claims") || highPriAreas.has("everything"))
        ) {
          score += 30;
        }

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        next = queue.splice(bestIdx, 1)[0];
      }
    }

    if (!next) {
      queue.length = 0;
      for (const res of resolutions.values()) {
        if (res.status === "unresolved") {
          res.status = "not_present";
          res.reason = "No page located via sitemap, navigation links, or URL pattern";
        }
      }
      stopReasonCode = "evidence_exhausted";
      stopReason = SOURCES_EXHAUSTED_STOP;
      stoppedByExhaustion = true;
      break;
    }

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

    // Record extraction tokens (estimated input ~400-500, output ~150-250)
    tokenAccount.extractionInputTokens += 450;
    tokenAccount.extractionOutputTokens += 200;

    const isFirstSample = examined.length === 0;

    if (evidence && validateProvenance(evidence)) {
      store.add(evidence);
      examined.push({ page: next, evidence });

      if (isFirstSample) {
        hypothesis = initialHypothesis(evidence);
      } else {
        hypothesis = mergeHypothesisLocal(hypothesis, evidence);
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
        message: `${next.pageType} sampled — ${Math.round(hypothesis.confidence * 100)}% confidence`,
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

  const coverage: CategoryCoverage = {
    coveragePercent: 0,
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

  if (stoppedByExhaustion) {
    const resolvedForCoverage = sampledCount + skippedCount;
    const guardCoverage = totalCategories === 0 || resolvedForCoverage === 0
      ? 0
      : Math.round((resolvedForCoverage / totalCategories) * 100);
    hypothesis.confidence = capConfidenceForCoverage(hypothesis.confidence, guardCoverage);
  }

  const unresolvedQuestionsList = hypothesis.unknown.map((u) => `${u.area} (${u.importance})`);
  const availableSourcesList = queue.map((p) => `${p.pageType}: ${p.url}`);
  const unresolvedCatsList = [...resolutions.values()]
    .filter((r) => r.status === "unresolved")
    .map((r) => String(r.category));
  const resolvedCatsList = [...resolutions.values()]
    .filter((r) => r.status === "sampled" || r.status === "skipped")
    .map((r) => String(r.category));

  const stopAnalysisLog =
    `STOP ANALYSIS\n` +
    `reason: ${stopReasonCode}\n` +
    `unresolvedQuestions: [${unresolvedQuestionsList.join(", ")}]\n` +
    `availableSources: [${availableSourcesList.join(", ")}]\n` +
    `unresolvedCategories: [${unresolvedCatsList.join(", ")}]\n` +
    `resolvedCategories: [${resolvedCatsList.join(", ")}]\n` +
    `analyzedPages: ${examined.length}\n` +
    `discoveredPages: ${pages.length}`;

  sendProgress(controller, {
    type: "investigation_stopped",
    message: stopAnalysisLog,
    detail: {
      stopReasonCode,
      stopReason,
      unresolvedQuestions: unresolvedQuestionsList,
      availableSources: availableSourcesList,
      unresolvedCategories: unresolvedCatsList,
      resolvedCategories: resolvedCatsList,
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
  const unexaminedDiscoveredList = queue.slice(0, 15).map((p) => `${p.pageType}: ${p.url}`).join(", ");
  const userPrompt =
    `URL: ${url}\n` +
    `Pages analyzed: ${examined.length}\n` +
    `Pages discovered total: ${pages.length}\n` +
    `Category coverage: ${coverage.coveragePercent}% (${coverage.sampled} sampled, ${coverage.skipped} skipped, ${coverage.notPresent} not present of ${coverage.total})\n` +
    `Stopped: ${stopReason} (Code: ${stopReasonCode})\n` +
    `Unexamined discovered sources: [${unexaminedDiscoveredList || "None"}]\n` +
    `Unresolved target categories: [${unresolvedCatsList.join(", ") || "None"}]\n` +
    `Resolved target categories: [${resolvedCatsList.join(", ") || "None"}]\n` +
    `Final hypothesis confidence: ${Math.round(hypothesis.confidence)}%\n` +
    `Known: ${hypothesis.known.map((k) => `${k.area}: ${k.detail}`).join(" | ")}\n` +
    `Remaining unknowns: ${hypothesis.unknown.map((u) => `${u.area} (${u.importance})`).join(", ") || "None"}\n` +
    `Confidence progression: ${confidenceProgression.map((c) => `${c.pageType}=${c.confidence}%`).join(" → ")}\n\n` +
    `Evidence Objects:\n${compressedEvidence}\n\n` +
    `Produce the full report JSON.`;

  tokenAccount.finalReportInputTokens = estimateTokens(finalReportSysPrompt() + userPrompt);

  const finalContent = await groq(
    [
      { role: "system", content: finalReportSysPrompt() },
      { role: "user", content: userPrompt },
    ],
    MAX_INFERENCE_TOKENS,
    0.2,
    (evt) => sendProgress(controller, evt),
  );

  tokenAccount.finalReportOutputTokens = estimateTokens(finalContent ?? "");
  tokenAccount.totalEstimatedTokens =
    tokenAccount.extractionInputTokens +
    tokenAccount.extractionOutputTokens +
    tokenAccount.hypothesisInputTokens +
    tokenAccount.hypothesisOutputTokens +
    tokenAccount.finalReportInputTokens +
    tokenAccount.finalReportOutputTokens;

  console.log("=== TOKEN ACCOUNTING ===");
  console.log(`extraction input: ${tokenAccount.extractionInputTokens}`);
  console.log(`extraction output: ${tokenAccount.extractionOutputTokens}`);
  console.log(`hypothesis input: ${tokenAccount.hypothesisInputTokens}`);
  console.log(`hypothesis output: ${tokenAccount.hypothesisOutputTokens}`);
  console.log(`final report input: ${tokenAccount.finalReportInputTokens}`);
  console.log(`final report output: ${tokenAccount.finalReportOutputTokens}`);
  console.log(`total estimated tokens: ${tokenAccount.totalEstimatedTokens}`);

  const parsedReport = parseJ<Record<string, unknown>>(finalContent);
  const report = parsedReport ?? buildFallbackReport({
    url,
    hypothesis,
    store,
    coverage,
    stopReason,
  });

  const finalStability = calculateStability(hypothesis, coverage, queue.length);

  const totalDiscoveredCount = Math.max(pages.length, seenUrls.size);
  const unexaminedCount = Math.max(0, totalDiscoveredCount - examined.length);
  const isBudgetExhausted = stopReasonCode === "budget_exhausted" || stopReason.toLowerCase().includes("budget") || unexaminedCount > 0;

  const authoritativeStopReason = isBudgetExhausted
    ? `Investigation paused at analysis budget (${examined.length} pages sampled out of ${totalDiscoveredCount} discovered). ${unexaminedCount} unexamined discovered sources remain.`
    : stopReason;

  const meta = buildMetadata(
    totalDiscoveredCount,
    examined.length,
    Math.max(skipped.length, unexaminedCount),
    skipped,
    tokenAccount.totalEstimatedTokens,
    store.count,
    authoritativeStopReason,
    hypothesis.confidence > 1 ? hypothesis.confidence / 100 : hypothesis.confidence,
    0,
    confidenceProgression,
    coverage,
    finalStability,
  );

  report.analyzedAt = new Date().toISOString();
  report.url = url;
  report.analysisMetadata = meta;

  if (isBudgetExhausted && report.intendedPosition && typeof report.intendedPosition === 'object') {
    (report.intendedPosition as Record<string, unknown>).rationale = authoritativeStopReason;
  }

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
