import type { PageCat, EvidenceObject, ProgressEvent, HypothesisState, PageMeta } from "./shared.ts";
import { groq, parseJ, rawFetch, extractText } from "./shared.ts";
import { linksFromHtml } from "./crawler.ts";

// ── Evidence Extraction Prompt ────────────────────────────────

function evidenceSysPrompt(): string {
  return `You are extracting structured evidence about a company's market position from a single webpage.

Given the page content, produce ONLY valid JSON with this shape:
{
  "intendedAudience": "who they appear to be targeting",
  "capabilities": ["list of capabilities mentioned"],
  "positioningClaims": ["specific claims about what they do/believe"],
  "differentiators": ["how they say they are different"],
  "credibilitySignals": ["metrics, logos, awards, testimonials, partnerships mentioned"],
  "productsMentioned": ["product or service names"],
  "recurringConcepts": ["repeated themes or keywords"],
  "supportingQuotes": [{"quote": "exact quote", "significance": "why it matters"}],
  "confidence": 0.0-1.0
}

Be concise. Extract only what's actually on the page. Do not invent.`;
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

  const trimmed = text.length > 2000 ? text.slice(0, 2000) : text;

  const raw = await groq(
    [
      { role: "system", content: evidenceSysPrompt() },
      {
        role: "user",
        content: `Page type: ${pageType}\nURL: ${url}\n\nContent:\n${trimmed}`,
      },
    ],
    800,
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
  return `You are a market position analyst merging new evidence into an ongoing investigation.

Given the current hypothesis and new evidence from a page, produce an updated hypothesis.

Rules:
- Add newly confirmed areas to "known"
- Remove unknowns that are now resolved
- Add new unknowns that emerged from this evidence
- Confidence represents the STABILITY of the market position, not model certainty
- Confidence INCREASES when evidence supports or refines the hypothesis
- Confidence DECREASES when contradictions appear
- Start low (~45-65 after first page) and grow as evidence accumulates
- Never exceed 99

Output ONLY valid JSON:
{
  "positionStatement": "concise statement of who they are and their market position",
  "known": [{"area": "topic", "detail": "what we know"}],
  "unknown": [{"area": "topic", "description": "what's unclear", "importance": "high|medium|low"}],
  "confidence": number 0-99
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
    // Fallback: keep current hypothesis, bump confidence slightly
    return {
      ...current,
      confidence: Math.min(99, current.confidence + 5),
    };
  }

  return {
    positionStatement: parsed.positionStatement || current.positionStatement,
    known: parsed.known || current.known,
    unknown: parsed.unknown || current.unknown,
    confidence: Math.min(99, Math.max(0, parsed.confidence ?? current.confidence)),
  };
}

// ── Evidence Store (in-memory, used unchanged) ────────────────

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
        lines.push(`Capabilities: ${ev.capabilities.join(", ")}`);
      }
      if (ev.positioningClaims.length) {
        lines.push(`Claims: ${ev.positioningClaims.join(" | ")}`);
      }
      if (ev.differentiators.length) {
        lines.push(`Differentiators: ${ev.differentiators.join(", ")}`);
      }
      if (ev.credibilitySignals.length) {
        lines.push(`Credibility: ${ev.credibilitySignals.join(", ")}`);
      }
      if (ev.productsMentioned.length) {
        lines.push(`Products: ${ev.productsMentioned.join(", ")}`);
      }
      if (ev.recurringConcepts.length) {
        lines.push(`Concepts: ${ev.recurringConcepts.join(", ")}`);
      }
      if (ev.supportingQuotes.length) {
        lines.push(
          `Quotes: ${ev.supportingQuotes.map((q) => `"${q.quote}" (${q.significance})`).join("; ")}`,
        );
      }
      return lines.join("\n");
    });
    return parts.join("\n\n");
  }
}