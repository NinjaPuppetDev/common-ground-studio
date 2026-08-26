import type { PageCat, EvidenceObject, ProgressEvent, HypothesisState, PageMeta } from "./shared.ts";
import { groq, parseJ, rawFetch, extractText } from "./shared.ts";
import { linksFromHtml } from "./crawler.ts";

// ── Evidence Extraction Prompt ────────────────────────────────

function evidenceSysPrompt(): string {
  return `You are extracting structured evidence about a subject company's market position from a single webpage.

EXTRACT EVIDENCE ACROSS 8 POSITIONING DIMENSIONS:
1. CAPABILITY: What can they actually do or build?
2. BUYER: Who appears to purchase or use the product/service?
3. PROBLEM: What customer problem is explicitly being solved?
4. OUTCOME: What measurable or observable result is promised or demonstrated?
5. CATEGORY: What market/category does the page say the company belongs to?
6. PROOF: What concrete evidence (case study metrics, customer names, testimonials, awards) proves the claims?
7. DIFFERENTIATION: Why choose this company instead of alternatives?
8. BUSINESS MODEL: How do they charge or package (pricing, subscriptions, custom contracts)?

CRITICAL RULES:
- Distinguish explicit claims ("Company claims X") from concrete proof ("Case study shows Y metric").
- If a dimension is absent or missing on this page, leave it empty/unspecified. DO NOT invent or assume missing dimensions.
- Extract ONLY what is explicitly stated on the page.

Given the page content, produce ONLY valid JSON with this shape:
{
  "intendedAudience": "who they appear to be targeting (BUYER)",
  "capabilities": ["list of capabilities mentioned (CAPABILITY)"],
  "positioningClaims": ["claims made about problems solved or category (PROBLEM / CATEGORY)"],
  "differentiators": ["how they say they are different (DIFFERENTIATION)"],
  "credibilitySignals": ["metrics, logos, awards, testimonials, client names (PROOF / OUTCOME)"],
  "productsMentioned": ["product, service, or offering names"],
  "recurringConcepts": ["repeated themes or keywords"],
  "supportingQuotes": [{"quote": "exact quote from page", "significance": "why it matters"}],
  "confidence": 0.0-1.0
}

Be concise. Extract only what is on the page. Do not invent.`;
}

// ── Provenance Validation ──────────────────────────────────────

export function validateProvenance(ev: EvidenceObject): boolean {
  if (!ev || !ev.url || !ev.pageType) return false;

  // Normalize extraction confidence to 0..1
  if (ev.confidence > 1.0) {
    ev.confidence = ev.confidence / 100;
  }

  // Anti-contamination filter: remove any references to analysis tool itself
  const BANNED_TERMS = [
    "common ground",
    "hypothesis stabilization",
    "multi-source scanning",
    "progressive multi-source",
    "category resolution",
    "coverage tracking",
    "evidence store",
    "provenance validation",
    "investigation engine",
    "evidence trees",
    "evidence assessment",
  ];

  const containsBanned = (text: string) =>
    BANNED_TERMS.some((term) => text.toLowerCase().includes(term));

  ev.capabilities = (ev.capabilities || []).filter((c) => !containsBanned(c));
  ev.positioningClaims = (ev.positioningClaims || []).filter((c) => !containsBanned(c));
  ev.differentiators = (ev.differentiators || []).filter((d) => !containsBanned(d));
  ev.credibilitySignals = (ev.credibilitySignals || []).filter((c) => !containsBanned(c));
  ev.recurringConcepts = (ev.recurringConcepts || []).filter((r) => !containsBanned(r));
  ev.supportingQuotes = (ev.supportingQuotes || []).filter(
    (q) => !containsBanned(q.quote) && !containsBanned(q.significance),
  );
  if (containsBanned(ev.intendedAudience)) {
    ev.intendedAudience = "";
  }

  // Require at least one valid extracted field
  return (
    ev.capabilities.length > 0 ||
    ev.positioningClaims.length > 0 ||
    ev.differentiators.length > 0 ||
    ev.credibilitySignals.length > 0 ||
    ev.productsMentioned.length > 0 ||
    ev.supportingQuotes.length > 0 ||
    Boolean(ev.intendedAudience)
  );
}

interface RawEvidence {
  intendedAudience: string;
  capabilities: string[];
  positioningClaims: string[];
  differentiators: string[];
  credibilitySignals: string[];
  productsMentioned: string[];
  recurringConcepts: string[];
  supportingQuotes: { quote: string; significance: string }[];
  confidence: number;
}

// ── Main evidence extraction ──────────────────────────────────

export async function extractEvidence(
  url: string,
  pageType: PageCat,
  title: string,
  sendProgress: (evt: ProgressEvent) => void,
  onLinks?: (links: PageMeta[]) => void,
): Promise<EvidenceObject | null> {
  const html = await rawFetch(url);
  if (!html) return null;

  // Surface navigation links found on this page so the investigation can
  // queue newly discovered pages (dedup happens in the caller).
  if (onLinks) {
    try {
      onLinks(linksFromHtml(html, new URL(url).origin));
    } catch {
      // link discovery is best-effort
    }
  }

  const text = extractText(html);
  if (text.length < 50) return null;

  // Cap page text aggressively (approx 1,200 - 1,500 chars / ~300-400 input tokens)
  const trimmed = text.length > 1500 ? text.slice(0, 1500) : text;

  const raw = await groq(
    [
      { role: "system", content: evidenceSysPrompt() },
      {
        role: "user",
        content: `Page type: ${pageType}\nURL: ${url}\n\nContent:\n${trimmed}`,
      },
    ],
    600,
    0.1,
    sendProgress,
  );

  const parsed = parseJ<RawEvidence>(raw);
  if (!parsed) {
    return {
      pageType,
      url,
      title,
      intendedAudience: "",
      capabilities: [],
      positioningClaims: [],
      differentiators: [],
      credibilitySignals: [],
      productsMentioned: [],
      recurringConcepts: [],
      supportingQuotes: [],
      confidence: 0,
    };
  }

  return {
    pageType,
    url,
    title,
    intendedAudience: parsed.intendedAudience ?? "",
    capabilities: parsed.capabilities ?? [],
    positioningClaims: parsed.positioningClaims ?? [],
    differentiators: parsed.differentiators ?? [],
    credibilitySignals: parsed.credibilitySignals ?? [],
    productsMentioned: parsed.productsMentioned ?? [],
    recurringConcepts: parsed.recurringConcepts ?? [],
    supportingQuotes: parsed.supportingQuotes ?? [],
    confidence: parsed.confidence ?? 0.5,
  };
}

// ── Hypothesis System Prompts ─────────────────────────────────

function mergeSysPrompt(): string {
  return `You are a market position analyst evaluating new evidence against an ongoing provisional hypothesis.

HYPOTHESIS TESTING & DISCONFIRMATION:
- Do NOT simply look for confirming evidence. Actively test if new evidence contradicts, narrows, expands, or refines the provisional hypothesis.
- Example: Homepage claims "AI Product Engineering", but Case Studies/Services reveal work is "Static Web UI Design". Record this discrepancy as an observed gap/contradiction and update the position statement.
- Distinguish CLAIMS ("Company claims X") from PROOF ("Case study demonstrates Y outcome").
- Incorporate specific product names, client types, pricing structures, or concrete differentiators found in the new evidence.
- Do NOT use generic placeholders like "appears positioned as a specialized provider" or "oriented toward its primary service domain".
- Include ONLY components supported by evidence. If audience or category is unknown, mark as unknown and use bounded language ("appears positioned as...", "provisional homepage evidence suggests..."). Do NOT fabricate missing dimensions.
- Update "known" with verified facts/proof, remove resolved unknowns, and add new unknowns/contradictions that emerged.
- Confidence represents evidence convergence and coverage (0.0 to 0.95). Confidence DECREASES if contradictions or ambiguities appear.

Output ONLY valid JSON:
{
  "positionStatement": "grounded statement synthesizing market position from total supported evidence",
  "known": [{"area": "topic", "detail": "what we know"}],
  "unknown": [{"area": "topic", "description": "what's unclear or contradictory", "importance": "high|medium|low"}],
  "confidence": number 0.0-0.95
}`;
}

// ── Merge hypothesis with new evidence ────────────────────────

export async function mergeHypothesis(
  current: HypothesisState,
  evidence: EvidenceObject,
  sendProgress?: (evt: ProgressEvent) => void,
): Promise<HypothesisState> {
  const raw = await groq(
    [
      { role: "system", content: mergeSysPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          currentHypothesis: current,
          newEvidence: {
            pageType: evidence.pageType,
            url: evidence.url,
            title: evidence.title,
            intendedAudience: evidence.intendedAudience,
            capabilities: evidence.capabilities,
            positioningClaims: evidence.positioningClaims,
            differentiators: evidence.differentiators,
            credibilitySignals: evidence.credibilitySignals,
            productsMentioned: evidence.productsMentioned,
            recurringConcepts: evidence.recurringConcepts,
            supportingQuotes: evidence.supportingQuotes,
          },
        }),
      },
    ],
    1000,
    0.15,
    sendProgress,
  );

  const parsed = parseJ<HypothesisState>(raw);
  if (!parsed) {
    return mergeHypothesisLocal(current, evidence);
  }

  const normConf = parsed.confidence > 1 ? parsed.confidence / 100 : (parsed.confidence ?? current.confidence);

  return {
    positionStatement: parsed.positionStatement || current.positionStatement,
    known: parsed.known || current.known,
    unknown: parsed.unknown || current.unknown,
    confidence: Math.min(0.95, Math.max(0, normConf)),
  };
}

// ── Deterministic local hypothesis merger (no LLM call) ───────

export function mergeHypothesisLocal(
  current: HypothesisState,
  evidence: EvidenceObject,
): HypothesisState {
  const known = [...current.known.map((k) => ({ ...k }))];

  const upsertKnown = (area: string, newItems: string[]) => {
    const valid = newItems.filter(Boolean);
    if (valid.length === 0) return;
    const idx = known.findIndex((k) => k.area.toLowerCase() === area.toLowerCase());
    if (idx >= 0) {
      const existing = known[idx].detail.split(/[,;]\s*/);
      const combined = Array.from(new Set([...existing, ...valid]));
      known[idx].detail = combined.slice(0, 6).join(", ");
    } else {
      known.push({ area, detail: valid.slice(0, 5).join(", ") });
    }
  };

  if (evidence.productsMentioned.length > 0) {
    upsertKnown("Products", evidence.productsMentioned);
  }
  if (evidence.capabilities.length > 0) {
    upsertKnown("Core capabilities", evidence.capabilities);
  }
  if (evidence.intendedAudience) {
    upsertKnown("Intended audience", [evidence.intendedAudience]);
  }
  if (evidence.positioningClaims.length > 0) {
    upsertKnown("Positioning claims", evidence.positioningClaims);
  }
  if (evidence.differentiators.length > 0) {
    upsertKnown("Differentiators", evidence.differentiators);
  }
  if (evidence.credibilitySignals.length > 0) {
    upsertKnown("Credibility signals", evidence.credibilitySignals);
  }
  if (evidence.pageType === "pricing" || evidence.positioningClaims.some((c) => /pric|plan|fee|subscri|tier|pay/i.test(c))) {
    const pricingClaims = evidence.positioningClaims.filter((c) => /pric|plan|fee|subscri|tier|pay/i.test(c));
    if (pricingClaims.length > 0) {
      upsertKnown("Commercial model", pricingClaims);
    } else if (evidence.pageType === "pricing") {
      upsertKnown("Commercial model", ["Published pricing and plans available"]);
    }
  }

  // Update unknowns: filter out resolved topics
  const knownAreas = new Set(known.map((k) => k.area.toLowerCase()));
  const unknown = current.unknown.filter((u) => {
    const area = u.area.toLowerCase();
    if (area.includes("capability") && knownAreas.has("core capabilities")) return false;
    if (area.includes("audience") && knownAreas.has("intended audience")) return false;
    if (area.includes("product") && knownAreas.has("products")) return false;
    if ((area.includes("differentiat") || area.includes("competitive")) && knownAreas.has("differentiators")) return false;
    if ((area.includes("proof") || area.includes("credibility")) && knownAreas.has("credibility signals")) return false;
    if ((area.includes("pricing") || area.includes("commercial")) && knownAreas.has("commercial model")) return false;
    return true;
  });

  const currentConf = current.confidence > 1 ? current.confidence / 100 : current.confidence;
  const evConf = evidence.confidence > 1 ? evidence.confidence / 100 : (evidence.confidence ?? 0.5);

  // Confidence reflects evidence quality & consistency, capped at 0.85
  const newConfidence = Math.min(0.85, (currentConf * 0.6) + (evConf * 0.3) + 0.05);

  // Construct grounded position statement synthesis from accumulated facts
  const prods = known.find((k) => k.area.toLowerCase() === "products")?.detail;
  const caps = known.find((k) => k.area.toLowerCase().includes("capabilities"))?.detail;
  const audience = known.find((k) => k.area.toLowerCase().includes("audience"))?.detail;
  const diffs = known.find((k) => k.area.toLowerCase().includes("differentiators"))?.detail;
  const commercial = known.find((k) => k.area.toLowerCase().includes("commercial"))?.detail;

  const parts: string[] = [];
  if (prods) parts.push(`offering ${prods}`);
  else if (caps) parts.push(`positioned as ${caps}`);

  if (audience) parts.push(`for ${audience}`);
  if (diffs) parts.push(`differentiated by ${diffs}`);
  if (commercial) parts.push(`with commercial model based on ${commercial}`);

  const positionStatement = parts.length > 0
    ? `Appears positioned as ${parts.join(", ")}, supported by multi-page evidence.`
    : current.positionStatement;

  return {
    positionStatement,
    known,
    unknown,
    confidence: Math.round(newConfidence * 100) / 100,
  };
}

// ── Evidence Store (in-memory, compressed summary) ────────────

export class EvidenceStore {
  private items: EvidenceObject[] = [];

  add(ev: EvidenceObject): void {
    this.items.push(ev);
  }

  getAll(): EvidenceObject[] {
    return [...this.items];
  }

  get count(): number {
    return this.items.length;
  }

  /** Merge evidence objects into a compressed summary for the inference call */
  toCompressedSummary(): string {
    const parts = this.items.map((ev, i) => {
      const lines: string[] = [
        `--- Evidence ${i + 1}: ${ev.pageType} (${ev.url}) ---`,
      ];
      if (ev.intendedAudience) lines.push(`Audience: ${ev.intendedAudience}`);
      if (ev.capabilities.length) {
        lines.push(`Capabilities: ${ev.capabilities.slice(0, 3).join(", ")}`);
      }
      if (ev.positioningClaims.length) {
        lines.push(`Claims: ${ev.positioningClaims.slice(0, 2).join(" | ")}`);
      }
      if (ev.differentiators.length) {
        lines.push(`Differentiators: ${ev.differentiators.slice(0, 2).join(", ")}`);
      }
      if (ev.credibilitySignals.length) {
        lines.push(`Credibility: ${ev.credibilitySignals.slice(0, 2).join(", ")}`);
      }
      if (ev.productsMentioned.length) {
        lines.push(`Products: ${ev.productsMentioned.slice(0, 2).join(", ")}`);
      }
      if (ev.supportingQuotes.length) {
        const topQuotes = ev.supportingQuotes.slice(0, 1);
        lines.push(
          `Quote: ${topQuotes.map((q) => `"${q.quote.slice(0, 100)}"`).join("; ")}`,
        );
      }
      return lines.join("\n");
    });
    return parts.join("\n\n");
  }
}