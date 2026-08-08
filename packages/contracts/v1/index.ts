/**
 * Common Ground - Versioned Domain Contracts (v1)
 * Shared vocabulary for investigation inputs, progress events, evidence structures,
 * hypothesis state, category resolution, and analysis reports.
 */

// ── Category & Page Metadata ───────────────────────────────

export type PageCat =
  | 'homepage'
  | 'about'
  | 'products'
  | 'case_studies'
  | 'customers'
  | 'pricing'
  | 'blog'
  | 'documentation'
  | 'careers'
  | 'support'
  | 'legal'
  | 'other';

export interface PageMeta {
  url: string;
  title: string;
  pageType: PageCat;
  priority: number;
}

// ── Evidence & Extraction Structures ──────────────────────────

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
  confidence: number; // 0–1 confidence in extraction
}

// ── Progressive Investigation & Hypothesis State ──────────────

export interface KnownFact {
  area: string;
  detail: string;
}

export interface UnknownArea {
  area: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface HypothesisState {
  positionStatement: string;
  known: KnownFact[];
  unknown: UnknownArea[];
  confidence: number; // 0–100
}

export interface NextSourceDecision {
  pageType: string;
  url: string;
  title: string;
  reason: string;
  expectedBenefit: string;
}

export interface ConfidenceProgression {
  step: number;
  pageType: string;
  confidence: number;
}

// ── Category Resolution & Coverage ──────────────────────────

export type CategoryStatus = 'unresolved' | 'sampled' | 'not_present' | 'skipped';

export interface CategoryResolution {
  category: PageCat | string;
  status: CategoryStatus;
  attemptedUrl: string | null;
  reason: string;
}

export interface CategoryCoverage {
  coveragePercent: number; // 0–100
  sampled: number;
  skipped: number;
  notPresent: number;
  total: number;
  resolutions: CategoryResolution[];
}

// ── Progress & SSE Events ───────────────────────────────────

export type ProgressEventType =
  | 'site_discovering'
  | 'site_discovered'
  | 'page_analysis_start'
  | 'page_analysis_result'
  | 'next_source_selected'
  | 'investigation_stopped'
  | 'rate_limit_waiting'
  | 'building_report'
  | 'inference_complete'
  | 'complete'
  | 'error';

export interface ProgressEvent {
  type: ProgressEventType;
  message: string;
  detail?: Record<string, unknown>;
  pagesDiscovered?: number;
  pagesAnalyzed?: number;
  pagesSkipped?: number;
  totalTokensUsed?: number;
  estimatedTokenSavings?: number;
  currentConfidence?: number;
}

// ── Analysis Input ──────────────────────────────────────────

export interface AnalysisInput {
  url?: string;
  documentText?: string;
  fileName?: string;
}

// ── Core Report & Positioning Triad Contracts ────────────────

export type PositionSignalType = 'philosophy' | 'capability' | 'credibility' | 'differentiation';

export type EvidenceScore = 'high' | 'medium' | 'low';

export type EarnedOutcome =
  | 'fully_earned'
  | 'mostly_earned'
  | 'partially_earned'
  | 'weakly_earned'
  | 'not_yet_earned';

export type ClarityLevel = 'explicit' | 'implicit' | 'ambiguous' | 'missing';

export type JourneyEffect = 'strengthens_position' | 'neutral' | 'weakens_position';

export type GapType =
  | 'missing_evidence'
  | 'existing_evidence_hidden'
  | 'weak_differentiation'
  | 'category_ambiguity'
  | 'audience_ambiguity'
  | 'credibility_gap'
  | 'messaging_inconsistency';

export interface Evidence {
  source: string;
  excerpt: string;
  supportsClaim: boolean;
  relevance: number; // 0–100
  evidenceType?: string;
}

export interface IntendedPosition {
  description: string;
  rationale: string;
}

export interface InferredPosition {
  description: string;
  rationale: string;
}

export interface EarnedPosition {
  outcome: EarnedOutcome;
  explanation: string;
}

export interface MarketSpace {
  primary: { space: string; rationale: string };
  secondary?: { space: string; rationale: string };
  emerging?: { space: string; rationale: string };
}

export interface PositioningSignal {
  id: string;
  signal: string;
  signalType: PositionSignalType;
  confidence: number; // 0–100
  overallScore: EvidenceScore;
  category?: string;
  reasoningNote: string;
  contributesToPosition: string;
  evidence: Evidence[];
}

export interface SourceCitation {
  url: string;
  title: string;
  snippet: string;
}

export interface PositioningClarityItem {
  question: string;
  clarity: ClarityLevel;
  explanation: string;
}

export interface PositioningClarity {
  overallAssessment: string;
  items: PositioningClarityItem[];
}

export interface PositioningGap {
  area: string;
  description: string;
  impact: 'minor' | 'moderate' | 'significant';
  gapType: GapType;
}

export interface VisitorJourneyStage {
  stage: 'homepage' | 'about' | 'products' | 'portfolio' | 'case_studies' | 'writing' | 'pricing' | 'call_to_action';
  effect: JourneyEffect;
  explanation: string;
}

export interface ObservationChain {
  observation: string;
  inference: string;
}

export interface PositioningRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  category: 'clarity' | 'credibility' | 'coherence' | 'trust';
  observationChain: ObservationChain;
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
  evidenceObjectsCount: number;
  confidenceProgression: ConfidenceProgression[];
  coverage?: CategoryCoverage;
}

export interface AnalysisReport {
  id: string;
  url: string;
  title: string;
  analyzedAt: string;
  overallScore: EvidenceScore;
  sourceCitations: SourceCitation[];

  // Core positioning triad
  intendedPosition: IntendedPosition;
  inferredPosition: InferredPosition;
  earnedPosition: EarnedPosition;

  // Market space
  marketSpace: MarketSpace;

  // Positioning analysis
  positionSummary: string;
  positioningSignals: PositioningSignal[];
  positioningClarity: PositioningClarity;
  positioningGaps: PositioningGap[];
  visitorJourney: VisitorJourneyStage[];
  positioningRecommendations: PositioningRecommendation[];

  // Final reflection
  finalQuestion: string;

  // Investigation metadata
  analysisMetadata?: AnalysisMetadata;
}

export type AppScreen = 'landing' | 'loading' | 'report';
