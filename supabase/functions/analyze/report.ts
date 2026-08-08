import type { AnalysisMetadata, CategoryCoverage } from "./shared.ts";

// ── Final Report Schema (system prompt) ───────────────────────

export function finalReportSysPrompt(): string {
  return `You are a market position analyst. Produce a complete market position report as JSON based on the evidence below.

Required JSON schema (output ONLY valid JSON, no markdown):
{
  "id": "<uuid>",
  "url": "<source>",
  "title": "<company>",
  "overallScore": "high|medium|low",
  "sourceCitations": [{"url":"","title":"","snippet":""}],
  "analyzedAt": "<ISO timestamp>",
  "intendedPosition": {"description":"","rationale":""},
  "inferredPosition": {"description":"","rationale":""},
  "earnedPosition": {"outcome":"fully_earned|mostly_earned|partially_earned|weakly_earned|not_yet_earned","explanation":""},
  "marketSpace": {"primary":{"space":"","rationale":""},"secondary":{"space":"","rationale":""},"emerging":{"space":"","rationale":""}},
  "positionSummary": "<one sentence>",
  "positioningSignals": [{"id":"signal-N","signal":"","signalType":"philosophy|capability|credibility|differentiation","confidence":0-100,"overallScore":"high|medium|low","category":"","reasoningNote":"","contributesToPosition":"","evidence":[{"source":"","excerpt":"","supportsClaim":true,"relevance":0,"evidenceType":"testimonial|metric|case_study|..."}]}],
  "positioningClarity": {"overallAssessment":"","items":[{"question":"What does this company do?","clarity":"explicit|implicit|ambiguous|missing","explanation":""},{"question":"Who is it for?","explanation":""},{"question":"What problem does it solve?","explanation":""},{"question":"What category does it belong to?","explanation":""},{"question":"Why choose this instead of another?","explanation":""}]},
  "positioningGaps": [{"area":"","description":"","impact":"minor|moderate|significant","gapType":"missing_evidence|existing_evidence_hidden|weak_differentiation|category_ambiguity|audience_ambiguity|credibility_gap|messaging_inconsistency"}],
  "visitorJourney": [{"stage":"homepage|about|products|portfolio|case_studies|writing|pricing|call_to_action","effect":"strengthens_position|neutral|weakens_position","explanation":""}],
  "positioningRecommendations": [{"priority":"high|medium|low","action":"","rationale":"","category":"clarity|credibility|coherence|trust","observationChain":{"observation":"","inference":""}}],
  "finalQuestion": "<what unique position would be lost if company disappeared?>"
}

METHOD: 1) Intended vs Inferred vs Earned 2) Market Space 3) Positioning Signals (philosophy/capability/credibility/differentiation) 4) Clarity (5 questions) 5) Visitor Journey 6) Gaps 7) Recommendations (Observation->Inference->Recommendation) 8) Final Reflection.
Never invent. All claims must trace to specific evidence. Every signal must reference specific evidence from the provided Evidence Objects.

HONESTY RULE: The investigation may have low category coverage, low confidence, or an early stop reason such as "Stopped — no further sources available". When coverage is low or evidence is sparse, reflect the limitation plainly: use "overallScore": "low", mark unclear clarity items as "missing", use "missing_evidence" gaps, keep confidence values low, and never fabricate evidence to fill gaps. A complete-looking report built on invented evidence is worse than an honest low-confidence one.`;
}

// ── Build analysis metadata from investigation results ───────

export function buildMetadata(
  pagesDiscovered: number,
  pagesAnalyzed: number,
  pagesSkipped: number,
  skippedPages: { url: string; category: string; reason: string }[],
  totalTokensUsed: number,
  evidenceObjectsCount: number,
  stopReason: string,
  finalConfidence: number,
  estimatedSavings: number,
  confidenceProgression: { step: number; pageType: string; confidence: number }[],
  coverage: CategoryCoverage,
): AnalysisMetadata {
  const sampled = coverage.sampled;
  const skipped = coverage.skipped;
  const resolvedForCoverage = sampled + skipped;

  // Guard: when nothing was sampled or skipped (e.g. every category came back
  // "Not present"), coverage is 0% — never NaN, Infinity, or undefined.
  const coveragePercent =
    coverage.total === 0 || resolvedForCoverage === 0
      ? 0
      : Math.round((resolvedForCoverage / coverage.total) * 100);

  return {
    pagesDiscovered,
    pagesAnalyzed,
    pagesSkipped,
    skippedPages,
    totalTokensUsed,
    estimatedTokenSavings: estimatedSavings,
    evidenceEfficiency:
      pagesAnalyzed > 0
        ? +(finalConfidence / pagesAnalyzed).toFixed(3)
        : 0,
    stopReason,
    finalConfidence: Math.round(finalConfidence * 100) / 100,
    evidenceObjectsCount,
    confidenceProgression,
    coverage: {
      ...coverage,
      coveragePercent,
    },
  };
}