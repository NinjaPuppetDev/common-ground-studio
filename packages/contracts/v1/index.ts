/**
 * Common Ground - Versioned Domain Contracts (v1)
 * Shared vocabulary for investigation inputs, progress events, evidence structures,
 * hypothesis state, category resolution, and analysis reports.
 */

// ── Category & Page Metadata ───────────────────────────────
import type { ProviderMatchResult } from "./provider.ts";
export * from "./provider.ts";

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
  confidence: number; // 0–1 canonical confidence
  positionStability?: number;
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
  confidence: number; // 0–1 canonical confidence
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
  mode?: 'layer1' | 'layer2' | 'layer3' | 'commonground';
  stage?: 'layer1' | 'layer2' | 'layer3' | 'commonground';
  report?: any;
  layer2Result?: any;
  userCapabilities?: string;
  providerId?: string;
}

export interface CommonGroundFinding {
  thesis: string;
  relationshipOutcome?: string;
}

export interface AgreementPointDetailed {
  explicitClaim: string;
  architecturalEvidence: string;
  businessProductImplication: string;
}

export interface DifferencePointDetailed {
  discrepancyType?: string;
  description: string;
  evidence: string;
}

export interface SystemRevelationDetailed {
  insight: string;
  evidence: string;
  systemImplication?: string;
}

export interface SystemModelTriad {
  observed: string;
  inferred: string;
  status: 'OBSERVED' | 'INFERRED' | 'UNKNOWN';
}

export interface SystemModel10Dimensions {
  coreProduct: SystemModelTriad;
  primaryUser: SystemModelTriad;
  problem: SystemModelTriad;
  valueCreationMechanism: SystemModelTriad;
  productMechanism: SystemModelTriad;
  acquisitionMechanism: SystemModelTriad;
  conversionMechanism: SystemModelTriad;
  commercialModel: SystemModelTriad;
  retentionExpansionMechanism: SystemModelTriad;
  importantProductSystemRelationships: SystemModelTriad;
}

export interface Layer1Layer2Comparison {
  whereTheyAgree: string[];
  whereTheyDiffer: string[];
  whatLayer2Reveals: string[];
}

export interface PotentialLeveragePoint {
  problem: string;
  evidence: string;
  whyItMatters: string;
  potentialIntervention: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface WhereICouldHelpProjectDetailed {
  projectOpportunity: string;
  whatINoticed: string;
  evidence: string;
  whyItMatters: string;
  potentialIntervention: string;
  expectedBusinessProductImpact: string;
  confidence: 'High' | 'Medium' | 'Low';
  // Legacy fallback compatibility
  projectTitle?: string;
  proposedScope?: string;
  expectedImpact?: string;
}

export type WhereICouldHelpProject = WhereICouldHelpProjectDetailed;

export interface FounderConversationAngle {
  whatINoticed: string;
  whyInteresting: string;
  question: string;
  fullAngle: string;
  // Alias / fallback fields
  observationX?: string;
  thoughtY?: string;
  questionZ?: string;
}

export interface OutboundProspectingAngleDetailed {
  whatINoticed: string;
  whyItMatters: string;
  potentialProject: string;
  whyIAmRelevant: string;
}

export type OpportunityStatusType = 
  | 'CREDIBLE OUTBOUND'
  | 'POTENTIAL HYPOTHESIS'
  | 'NO CREDIBLE OPPORTUNITY'
  | 'NO CREDIBLE OPPORTUNITY YET'
  | 'INSUFFICIENT EVIDENCE'
  | 'HIGH-POTENTIAL OUTBOUND'
  | 'POSSIBLE OUTBOUND'
  | 'STRONG OPPORTUNITY'
  | 'POSSIBLE OPPORTUNITY';

// ── Provider Profile & Prospect Matching Layer ─────────────
export * from "./provider.js";

export type ProblemSituationType = 
  | 'A' // Complex Product Communication
  | 'B' // Strong Product / Weak Digital Surface
  | 'C' // Product Demonstration
  | 'D' // AI Product Interface
  | 'E' // Launch / Validation Surface
  | 'F' // Product Experience Gap
  | 'G' // Prototype → Working Product
  | 'H' // Conversion / Acquisition Experience
  | 'NONE';

// Backward-compatible alias
export type ProblemCategoryType = ProblemSituationType | string;

export type ProviderCapabilityCategory = 
  | 'Product Communication'
  | 'Interactive Product Experience'
  | 'AI Product Interface'
  | 'Product-led Website'
  | 'Digital Product Prototype'
  | 'Prototype-to-Production Implementation'
  | 'UX / Product Architecture'
  | 'Launch / Validation Experience'
  | 'Acquisition / Conversion Experience'
  | 'Lightweight Full-Stack Product Build'
  | 'None';

export interface ProviderProfileHypothesis {
  category: ProblemSituationType;
  title: string;
  description: string;
  potentialSolution: string;
  potentialEvidence: string[];
}

export interface Stage3EvidenceBoundary {
  analyzedPagesCount: number;
  discoveredPagesCount: number;
  unexaminedPagesCount: number;
  analyzedPages: string[];
  unexaminedPages: string[];
  whatWeKnow: string[];
  whatWeInfer: string[];
  whatRemainsUnknown: string[];
  scopeNote: string;
  // Aliases for compatibility
  observedFacts?: string[];
  inferences?: string[];
  unknowns?: string[];
}

// Backward-compatibility interfaces
export interface TensionGapItem {
  claim: string;
  architecturalEvidence: string;
  tension: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface SystemModel8Dimensions {
  product: SystemModelTriad;
  user: SystemModelTriad;
  problem: SystemModelTriad;
  mechanism: SystemModelTriad;
  distribution: SystemModelTriad;
  commercialModel: SystemModelTriad;
  conversion: SystemModelTriad;
  retention: SystemModelTriad;
}

// Backward-compatibility interfaces
export interface AgreementPoint {
  explicitClaim: string;
  architecturalEvidence: string;
  businessImplication: string;
  whatThisTellsUs?: string;
}

export interface DifferencePoint {
  discrepancyType: string;
  description: string;
  evidence: string;
}

export interface SystemRevelation {
  insight: string;
  evidence: string;
}

export interface ObservedVSInference {
  observed: string;
  inference: string;
}

export interface BusinessAsProductSystem {
  coreMechanism: ObservedVSInference;
  primaryUser: ObservedVSInference;
  valueCreation: ObservedVSInference;
  commercialModel: ObservedVSInference;
  acquisitionMechanism: ObservedVSInference;
  conversionMechanism: ObservedVSInference;
  retentionOrExpansion: ObservedVSInference;
  productSystemRelationships: ObservedVSInference;
}

export type BusinessAsSystem = BusinessAsProductSystem;

export interface LeveragePointItem {
  opportunity: string;
  evidence: string;
  whyItMatters: string;
  potentialIntervention: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ClientOpportunityItem {
  projectTitle: string;
  proposedScope: string;
  expectedImpact: string;
}

export interface OpportunityItem {
  opportunity: string;
  evidence: string;
  whyItMatters: string;
  howICouldHelp: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface OutboundProspectingAngle {
  whatINoticed: string;
  whyInteresting: string;
  potentialConversation: string;
  whyItMatters?: string;
  potentialIntervention?: string;
  whyWorthDiscussing?: string;
}

export type OutboundAngle = OutboundProspectingAngle;

export interface EvidenceBoundary {
  whatWeKnow: string[];
  whatWeInfer: string[];
  whatRemainsUnknown: string[];
  analyzedScopeNote: string;
}

export interface CommonGroundSynthesis {
  // 1. Common Ground Finding / System Thesis
  systemThesis: string;
  commonGroundFinding?: string | CommonGroundFinding;

  // 2. Where They Agree
  whereTheyAgree?: AgreementPointDetailed[] | AgreementPoint[] | string[];

  // 3. Where They Differ
  whereTheyDiffer?: DifferencePointDetailed[] | DifferencePoint[] | string[];

  // 4. What The System Reveals That Copy Does Not
  whatSystemReveals?: SystemRevelationDetailed[] | SystemRevelation[] | string[];

  // 5. The Business / Product as a System (10 Dimensions)
  systemModel: SystemModel10Dimensions;

  // 6. System Leverage Points
  leveragePoints: PotentialLeveragePoint[];
  leveragePointsSummary?: string;

  // 7. Where I Could Help (Up to 3 Opportunities)
  whereICouldHelp: WhereICouldHelpProjectDetailed[] | WhereICouldHelpProject[];
  whereICouldHelpSummary?: string;

  // 8. Opportunity Test
  opportunityTestResults?: string[];

  // 9. Founder Conversation Angle
  founderConversationAngle: FounderConversationAngle;

  // 10. Outbound Prospecting Angle
  outboundProspectingAngle?: OutboundProspectingAngleDetailed;

  // 11. Distinctive System Signal
  distinctiveSystemSignal: string;

  // 12. Opportunity Status
  opportunityStatus: OpportunityStatusType;
  opportunityStatusReasoning?: string;

  // 13. Evidence Boundary
  evidenceBoundary: Stage3EvidenceBoundary;

  // 14. Provider Matching Layer (David Raigoza / Lightweight Studio)
  providerMatch?: ProviderMatchResult;

  // Backward compatibility fields
  comparison?: Layer1Layer2Comparison;
  whatLayer1Says?: string[];
  whatLayer2Reveals?: string[];
  commonGround?: string;
  tensionsAndGaps?: TensionGapItem[];
  hasMaterialGap?: boolean;
  potentialLeveragePoints?: PotentialLeveragePoint[];
  businessAsSystem?: BusinessAsProductSystem;
  outboundAngle?: OutboundProspectingAngle;
  commonGroundSignal?: string;
}

// ── Layer 2 Architectural Analysis ──────────────────────────

export interface SourceCoverage {
  discoveredPagesCount: number;
  analyzedPagesCount: number;
  unexaminedPagesCount: number;
  isPartialCoverage: boolean;
  coverageNote: string;
}

export interface Layer2SupportingEvidence {
  sourcePages: string[];
  relationshipObserved: string;
  interpretation?: string;
  status: 'OBSERVED' | 'INFERRED' | 'INFERENCE' | 'UNKNOWN';
}

// ── Adaptive Evidence Loop & Gap Assessment ─────────────────

export interface EvidenceRequirementItem {
  claim: string;
  requiredEvidence: string[];
  availableEvidence: string[];
  missingEvidence: string[];
  candidatePages: string[];
  confidence: number | 'High' | 'Medium' | 'Low';
  status: 'needs_investigation' | 'established' | 'provisional' | 'unresolved' | 'contradicted';
}

export interface AdaptiveEvidenceInvestigationStep {
  stepNumber: number;
  selectedUrl: string;
  pageType: string;
  claimTargeted: string;
  reason: string;
  expectedBenefit: string;
  evidenceFound: string;
  updatedClaimStatus: 'needs_investigation' | 'established' | 'provisional' | 'unresolved' | 'contradicted';
}

export interface AdaptiveEvidenceAssessment {
  established: string[];
  provisional: string[];
  unresolved: string[];
  investigatedNext: {
    pageUrl: string;
    pageType?: string;
    resolvedClaim?: string;
    evidenceFound?: string;
  }[];
  evidenceRequirements: EvidenceRequirementItem[];
  investigationSteps?: AdaptiveEvidenceInvestigationStep[];
  stopCondition: 'sufficient_evidence' | 'stable_conclusion' | 'contradiction_found' | 'evidence_exhausted' | 'budget_exhausted';
  stopExplanation: string;
  iterationRounds: number;
}

export interface Layer2AnalysisResult {
  layer2Title: string; // "What The Website Reveals"
  analyzedAt: string;
  targetUrl: string;
  navigationAndIa: string;
  pageRelationships: string;
  productServiceStructure: string;
  commercialStructure: string; // Exact fallback if missing: "Commercial structure not established from available evidence."
  proofAndTrust: string;
  conversionPaths: string;
  expectedVisitorSequence: string;
  structuralPriorities: string;
  contradictions: string; // Exact fallback if none: "No material structural contradiction observed."
  nonObviousRelationships: string;
  crossPageEvidence: Layer2SupportingEvidence[];
  whatRemainsUnknown: string;
  architecturalSynthesis: string;
  sourceCoverage?: SourceCoverage | null;
  evidenceGapAssessment?: AdaptiveEvidenceAssessment | null;
  commonGroundSynthesis?: CommonGroundSynthesis | null;
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
  positionStability?: number;
  evidenceObjectsCount: number;
  confidenceProgression: ConfidenceProgression[];
  coverage?: CategoryCoverage;
}

export interface FounderLensEvidence {
  source: string;
  pageType: string;
  observation: string;
  evidenceType?: 'copy' | 'navigation' | 'ia' | 'product_flow' | 'pricing' | 'cta' | 'proof' | 'case_study' | 'repeated_pattern' | 'cross_page_relationship' | string;
}

export interface FounderLensUnderlyingProblem {
  problem: string;
  whoCares: string;
}

export interface FounderLensConfidence {
  evidenceConfidence: number;
  siteCoverage: number;
  interpretationConfidence: number;
  confidenceNote?: string;
}

export interface Layer1WhatTheySay {
  whatItOffers: string;
  whoItServes: string;
  problemsAddressed: string;
  offeringsAndProducts: string;
  claimsAndDifferentiators: string;
  keyTerminology: string;
  explicitCopySummary: string;
}

export interface Layer2WhatSiteReveals {
  navigationAndIa: string;
  hierarchyAndPages: string;
  productsServicesRelationship: string;
  pricingCommercialStructure: string;
  proofAndCaseStudies: string;
  ctasAndConversionPaths: string;
  expectedVisitorSequence: string;
  systemicReconstruction: string;

  // Systemic Architectural Identification Points
  whatArchitecturePrioritizes?: string;
  expectedNextAction?: string;
  decisionSequence?: string;
  monetizedStructure?: string;
  whatArchitectureRevealsBeyondCopy?: string;
  prioritizationContradictions?: string;
  nonObviousRelationships?: string;
}

export interface LayerComparison {
  whereTheyAgree: string;
  whereTheyDiffer: string;
  whatLayer2Reveals: string;
  whatRemainsUnknown: string;
}

export interface FounderLens {
  // Layer 1: Communicated Claims
  layer1WhatTheySay?: Layer1WhatTheySay;

  // Layer 2: Systemic Website Structure & Relationships
  layer2WhatSiteReveals?: Layer2WhatSiteReveals;

  // Synthesis: Comparison between Layer 1 and Layer 2
  layerComparison?: LayerComparison;

  // Primary fields & backward compatibility
  whatTheySay: string;
  whatTheSiteDoes: string;
  whatTheBusinessAppearsToBe: string;
  whatTheyActuallyDo: string;
  theBusinessModel: string;
  theCustomerJourney: string;
  theMechanism: string;
  theNonGenericSignal: string;
  theGap: string;
  theUnderlyingProblem?: FounderLensUnderlyingProblem;
  theMetaphor: string | null;
  evidenceKeyObservations: FounderLensEvidence[];
  confidenceBreakdown?: FounderLensConfidence;
  evidenceGapAssessment?: AdaptiveEvidenceAssessment | null;

  // Optional handles
  whatTheSiteReveals?: string;
  theDistinctiveMechanism?: string;
  theDistinctiveSignal?: string;
}

export interface AnalysisReport {
  id: string;
  url: string;
  title: string;
  analyzedAt: string;
  overallScore: EvidenceScore;
  sourceCitations: SourceCitation[];

  // Founder Investigation Lens
  founderLens?: FounderLens;

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

  // Dedicated Layer 2 Architectural Analysis
  layer2Analysis?: Layer2AnalysisResult | null;

  // Stage 3 Common Ground Comparison & Commercial Synthesis
  commonGroundSynthesis?: CommonGroundSynthesis | null;
}

export type AppScreen = 'landing' | 'loading' | 'report';
