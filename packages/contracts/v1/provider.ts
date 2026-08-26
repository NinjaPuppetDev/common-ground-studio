/**
 * Common Ground - Versioned Provider Contract (v1)
 * Formal definition of a Provider Profile and the Problem-to-Provider qualification schema.
 * 
 * Concept Model:
 * COMPANY (Evidenced Reality)
 *   ↓
 * EVIDENCE (Observed, Strongly Supported, Inferred, Unknown)
 *   ↓
 * PROBLEMS / CONDITIONS (Evidenced Business/Product Issues)
 *   ↓
 * PROVIDER PROFILE (Problem Contexts, Mechanisms, Delivery Model)
 *   ↓
 * PROBLEM-TO-PROVIDER MATCH
 *   ↓
 * QUALIFICATION (HIGH / MEDIUM / LOW -> OUTREACH / WATCH / DISCARD)
 *   ↓
 * OPPORTUNITY SYNTHESIS (Grounded Formula & Angle)
 */

export interface ProviderProblemContext {
  id: string;
  title: string;
  description: string;

  // Specific observable signals that could indicate this problem.
  problemSignals: string[];

  // How this provider addresses the problem.
  solutionMechanism: string;
}

export interface ProviderCapability {
  id: string;
  title: string;

  // What the capability actually does for the client (mechanism, not mere tool).
  mechanism: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  title: string;

  // Concise provider value proposition.
  valueProposition: string;

  // The continuity/gap the provider is designed to solve.
  gapSolved: string;

  primaryProblemContexts: ProviderProblemContext[];

  capabilities: ProviderCapability[];

  // Supporting signals, not automatic qualification criteria.
  bestFitEnvironments: string[];

  // Explicit reasons to reject a prospect.
  disqualificationCriteria: string[];

  outreachPromptModel: {
    inquiryTemplate: string;
  };
}

export type ProspectFitType = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProspectDecisionType = 'OUTREACH' | 'WATCH' | 'DISCARD';
export type EvidenceLevel = 'OBSERVED' | 'STRONGLY_SUPPORTED' | 'INFERRED' | 'UNKNOWN';

export interface OpportunitySynthesis {
  evidencedCondition: string;
  evidence: string;
  businessProductConsequence: string;
  providerMatchContextId: string;
  providerMatchTitle: string;
  solutionMechanism: string;
  timingSignal: string;
  qualification: ProspectDecisionType;
  evidenceNeeded?: string;

  // Compatibility aliases
  companyProblem?: string;
  davidsRelevantCapability?: string;
  potentialEngagement?: string;
  expectedBusinessValue?: string;
  evidenceConfidence?: string;
}

export interface SevenDimensionFitEvaluation {
  problemFit: { score: 'Strong' | 'Moderate' | 'Weak' | 'None'; note: string };
  capabilityFit: { score: 'Strong' | 'Moderate' | 'Weak' | 'None'; note: string };
  deliveryFit: { score: 'Strong' | 'Moderate' | 'Weak' | 'None'; note: string };
  timingFit: { score: 'Strong' | 'Moderate' | 'Weak' | 'None'; note: string; trigger?: string };
  proofFit: { score: 'Strong' | 'Moderate' | 'Weak' | 'None'; note: string; relevantProof?: string };
  commercialFit: { score: 'Strong' | 'Moderate' | 'Weak' | 'None'; note: string };
  evidenceStrength: { score: 'High' | 'Moderate' | 'Low' | 'Insufficient'; note: string };
}

export interface ProviderMatchResult {
  fit: ProspectFitType;
  decision: ProspectDecisionType;
  matchedProblemContextId?: string;
  matchedProblemContextTitle?: string;
  companyNeed: string;
  evidence: string;
  providerFit: string;
  deliveryFit: string;
  timingOrTrigger: string;
  relevantProof: string;
  opportunity: string;
  opportunitySynthesis?: OpportunitySynthesis;
  outreachAngle: string;
  confidence: number; // 0–100%
  sevenDimensionFit?: SevenDimensionFitEvaluation;
  upgradeRequirements?: string; // What evidence is needed to upgrade if WATCH
  disqualificationReason?: string; // Why disqualified if DISCARD
  providerId?: string;
  providerName?: string;

  // Compatibility aliases
  problemCategory?: string;
  problemCategoryLabel?: string;
  capabilityCategory?: string;
}
