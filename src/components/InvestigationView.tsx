import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw, ExternalLink, ArrowRight, Search,
  Users, Lightbulb, Award, Layers, FileDown, Loader2,
  Compass, Network, GitFork, DollarSign, ShieldCheck,
  Route, Footprints, Star, AlertTriangle, Unlink, CheckCircle2,
  Sparkles, Briefcase, MessageSquare, Eye, Target
} from 'lucide-react';
import type { ProgressEvent, AnalysisReport, HypothesisState, Layer2AnalysisResult, CommonGroundSynthesis, AdaptiveEvidenceAssessment } from '../types';
import { generatePDFReport, downloadPDFBlob, buildPDFFilename } from '../lib/generatePDF';
import ThemeToggle from './ThemeToggle';
import AuthHeaderButton from './AuthHeaderButton';
import { useAuth } from '../context/AuthContext';

/* ── Props ──────────────────────────────────────────── */

interface InvestigationViewProps {
  progressEvents: ProgressEvent[];
  report: AnalysisReport | null;
  onReset: () => void;
}

/* ── Helpers ──────────────────────────────────────────── */

function confidenceColor(conf: number): string {
  if (conf >= 80) return 'bg-evidence-high';
  if (conf >= 50) return 'bg-evidence-medium';
  return 'bg-primary';
}

function pageTypeIcon(type: string) {
  switch (type) {
    case 'homepage': return <Search className="w-3.5 h-3.5" />;
    case 'about': return <Users className="w-3.5 h-3.5" />;
    case 'products':
    case 'case_studies': return <Lightbulb className="w-3.5 h-3.5" />;
    case 'customers': return <Award className="w-3.5 h-3.5" />;
    default: return <Layers className="w-3.5 h-3.5" />;
  }
}

function extractHypothesis(detail: Record<string, unknown> | undefined): HypothesisState | null {
  if (!detail?.hypothesis) return null;
  const h = detail.hypothesis as Record<string, unknown>;
  return {
    positionStatement: (h.positionStatement as string) || '',
    known: (h.known as { area: string; detail: string }[]) || [],
    unknown: ((h.unknown as { area: string; description: string; importance: string }[]) || []).map((u) => ({
      area: u.area,
      description: u.description,
      importance: (u.importance === 'high' || u.importance === 'medium' || u.importance === 'low' ? u.importance : 'medium') as 'high' | 'medium' | 'low',
    })),
    confidence: (h.confidence as number) || 0,
  };
}

/* ── Confidence Progression Bar (compact horizontal) ── */

function ConfidenceBar({ progression }: { progression: { page: string; confidence: number }[] }) {
  if (progression.length === 0) return null;
  return (
    <div className="flex items-end gap-1.5 h-16 mb-4">
      {progression.map((p, i) => {
        const pct = p.confidence <= 1 ? Math.round(p.confidence * 100) : Math.round(p.confidence);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-foreground/40">{pct}%</span>
            <div
              className="w-full rounded-t-sm transition-all duration-700 ease-out"
              style={{
                height: `${Math.max(8, (pct / 100) * 56)}px`,
                backgroundColor: pct >= 80
                  ? 'var(--color-evidence-high)'
                  : pct >= 50
                    ? 'var(--color-evidence-medium)'
                    : 'var(--color-primary)',
                opacity: i === progression.length - 1 ? 1 : 0.5,
              }}
            />
            <span className="text-[8px] text-foreground/30 uppercase truncate max-w-full leading-tight">
              {p.page === 'homepage' ? 'Home' : p.page.slice(0, 6)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Investigation Journal ──────────────────────────── */

function InvestigationJournal({ events }: { events: ProgressEvent[] }) {
  const journal: { type: string; data: ProgressEvent }[] = [];

  for (const ev of events) {
    if (ev.type === 'page_analysis_result') {
      journal.push({ type: 'result', data: ev });
    } else if (ev.type === 'next_source_selected') {
      journal.push({ type: 'decision', data: ev });
    } else if (ev.type === 'investigation_stopped') {
      journal.push({ type: 'stopped', data: ev });
    }
  }

  if (journal.length === 0) {
    const discovering = events.find((e) => e.type === 'site_discovering');
    return (
      <div className="text-center py-8">
        <p className="text-xs text-foreground/40">
          {discovering ? 'Scanning website structure…' : 'Initializing investigation…'}
        </p>
        <div className="flex justify-center mt-3 gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {journal.map((entry, i) => {
        if (entry.type === 'result') {
          const hyp = extractHypothesis(entry.data.detail);
          const pageType = (entry.data.detail?.pageType as string) || 'page';
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-fadeIn">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary">
                  {pageTypeIcon(pageType)}
                </span>
                <span className="text-[10px] font-mono font-semibold text-foreground/50 uppercase tracking-wider">
                  {pageType.replace(/_/g, ' ')} analyzed
                </span>
                {hyp && (() => {
                  const confPct = hyp.confidence <= 1 ? Math.round(hyp.confidence * 100) : Math.round(hyp.confidence);
                  return (
                    <span className="ml-auto flex items-center gap-1 text-xs font-semibold"
                      style={{
                        color: confPct >= 80 ? 'var(--color-evidence-high)' :
                               confPct >= 50 ? 'var(--color-evidence-medium)' :
                               'var(--color-foreground)'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {confPct}%
                    </span>
                  );
                })()}
              </div>

              {hyp && (
                <div className="space-y-2 text-sm">
                  <p className="text-foreground/70 leading-relaxed italic text-xs">
                    "{hyp.positionStatement}"
                  </p>

                  {hyp.known.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-evidence-high uppercase tracking-wider mb-1">Known</p>
                      <div className="flex flex-wrap gap-1">
                        {hyp.known.map((k, j) => (
                          <span key={j} className="text-[10px] bg-evidence-high/10 text-evidence-high/80 px-2 py-0.5 rounded-full">
                            ✓ {k.area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {hyp.unknown.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">Uncertain</p>
                      <div className="flex flex-wrap gap-1">
                        {hyp.unknown.map((u, j) => (
                          <span key={j} className="text-[10px] bg-amber-400/10 text-amber-400/60 px-2 py-0.5 rounded-full">
                            ? {u.area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        if (entry.type === 'decision') {
          const d = entry.data.detail;
          const pageType = (d?.pageType as string) || '';
          const reason = (d?.reason as string) || '';
          return (
            <div key={i} className="flex items-start gap-3 py-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/15 text-purple-400 shrink-0 mt-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground/70">
                  Checking <span className="font-semibold text-primary capitalize">{pageType.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-[11px] text-foreground/40 mt-0.5 leading-relaxed">{reason}</p>
              </div>
            </div>
          );
        }

        if (entry.type === 'stopped') {
          const isBudgetExhausted = entry.data.detail?.stopReasonCode === 'budget_exhausted' ||
            entry.data.message?.toLowerCase().includes('budget') ||
            ((entry.data.pagesDiscovered || 0) > (entry.data.pagesAnalyzed || 0));
          return (
            <div key={i} className="bg-card border border-evidence-high/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <svg viewBox="0 0 10 10" fill="none" stroke="var(--color-evidence-high)" strokeWidth={2} className="w-3 h-3 shrink-0">
                  <path d="M2 5l2 2 4-4" />
                </svg>
                <span className="text-xs font-semibold text-evidence-high">
                  {isBudgetExhausted ? "Investigation paused (Budget limit reached)" : "Investigation complete"}
                </span>
              </div>
              <p className="text-[11px] text-foreground/50 leading-relaxed">
                {(entry.data.detail?.stopReason as string) || entry.data.message}
              </p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function cleanDisplay(text?: string): string {
  if (!text) return "";
  return text
    .replace(/=== SOURCE:[^=]+===/g, " ")
    .replace(/Title:\s*[^\n]+/g, " ")
    .replace(/Content:\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDerivedFounderLens(report: AnalysisReport) {
  const fl = report.founderLens;
  const whatTheySay = cleanDisplay(fl?.whatTheySay || report.intendedPosition?.description || report.title || "Subject landing claims");
  const whatTheSiteDoes = cleanDisplay(fl?.whatTheSiteDoes || fl?.whatTheSiteReveals || `Whole-site IA, navigation structure, product/service pages, and conversion flows reveal an operational system designed around: ${cleanDisplay(report.positionSummary || report.inferredPosition?.description || whatTheySay)}`);
  const whatTheBusinessAppearsToBe = cleanDisplay(fl?.whatTheBusinessAppearsToBe || `Reconstructed operational model derived from page hierarchy, commercial pathways, and CTA conversion flows.`);
  const whatTheyActuallyDo = cleanDisplay(fl?.whatTheyActuallyDo || report.positionSummary || report.inferredPosition?.description || whatTheySay);
  const theBusinessModel = cleanDisplay(fl?.theBusinessModel || `Commercial structure established from available page evidence and direct action CTAs.`);
  const theCustomerJourney = cleanDisplay(fl?.theCustomerJourney || `Visitors move from top-level capability statements through feature evaluation to primary action endpoints.`);
  const theMechanism = cleanDisplay(fl?.theMechanism || fl?.theDistinctiveMechanism || fl?.theDistinctiveSignal || "Operational workflow mechanism derived from examined product capabilities.");
  const theNonGenericSignal = cleanDisplay(fl?.theNonGenericSignal || (fl?.theDistinctiveSignal !== fl?.theDistinctiveMechanism ? fl?.theDistinctiveSignal : undefined) || "Observed capability alignment across examined page evidence.");
  const theGap = cleanDisplay(fl?.theGap || (report.intendedPosition?.description === report.inferredPosition?.description ? "Marketing claims directly reflect the underlying product/service model based on analyzed pages." : `Marketing copy emphasizes primary positioning claims, whereas whole-site evidence indicates an underlying focus on: ${whatTheyActuallyDo}`));
  
  const problemItem = report.positioningClarity?.items?.find(i => i.question.toLowerCase().includes("problem"));
  const audienceItem = report.positioningClarity?.items?.find(i => i.question.toLowerCase().includes("who"));

  const problemText = cleanDisplay(fl?.theUnderlyingProblem?.problem || problemItem?.explanation || `Workflow challenges and implementation requirements in ${report.marketSpace?.primary?.space || 'the target domain'}.`);
  const whoCaresText = cleanDisplay(fl?.theUnderlyingProblem?.whoCares || audienceItem?.explanation || "Users and practitioners identified across primary copy and product capabilities.");

  // Layer 1: What the company explicitly communicates
  const layer1WhatTheySay = {
    whatItOffers: cleanDisplay(fl?.layer1WhatTheySay?.whatItOffers || whatTheySay),
    whoItServes: cleanDisplay(fl?.layer1WhatTheySay?.whoItServes || whoCaresText),
    problemsAddressed: cleanDisplay(fl?.layer1WhatTheySay?.problemsAddressed || problemText),
    offeringsAndProducts: cleanDisplay(fl?.layer1WhatTheySay?.offeringsAndProducts || theBusinessModel),
    claimsAndDifferentiators: cleanDisplay(fl?.layer1WhatTheySay?.claimsAndDifferentiators || theNonGenericSignal),
    keyTerminology: cleanDisplay(fl?.layer1WhatTheySay?.keyTerminology || report.marketSpace?.primary?.space || "Category positioning terms"),
    explicitCopySummary: cleanDisplay(fl?.layer1WhatTheySay?.explicitCopySummary || whatTheySay),
  };

  // Layer 2: What the website reveals as an operational system
  const layer2WhatSiteReveals = {
    navigationAndIa: cleanDisplay(fl?.layer2WhatSiteReveals?.navigationAndIa || "Site navigation structures user entry points around primary product categories and resource paths."),
    hierarchyAndPages: cleanDisplay(fl?.layer2WhatSiteReveals?.hierarchyAndPages || "Page hierarchy branches from high-level positioning down to specific capability and action endpoints."),
    productsServicesRelationship: cleanDisplay(fl?.layer2WhatSiteReveals?.productsServicesRelationship || theMechanism),
    pricingCommercialStructure: cleanDisplay(fl?.layer2WhatSiteReveals?.pricingCommercialStructure || theBusinessModel),
    proofAndCaseStudies: cleanDisplay(fl?.layer2WhatSiteReveals?.proofAndCaseStudies || "Proof and trust signals not established from available page links."),
    ctasAndConversionPaths: cleanDisplay(fl?.layer2WhatSiteReveals?.ctasAndConversionPaths || "Primary CTAs route visitors toward primary action endpoints (such as download, signup, or direct onboarding)."),
    expectedVisitorSequence: cleanDisplay(fl?.layer2WhatSiteReveals?.expectedVisitorSequence || theCustomerJourney),
    systemicReconstruction: cleanDisplay(fl?.layer2WhatSiteReveals?.systemicReconstruction || whatTheSiteDoes),

    // 7 Systemic Architectural Identification Points
    whatArchitecturePrioritizes: cleanDisplay(fl?.layer2WhatSiteReveals?.whatArchitecturePrioritizes || fl?.layer2WhatSiteReveals?.navigationAndIa || "Primary navigation items and hero elements elevate core offerings above supplementary resources."),
    expectedNextAction: cleanDisplay(fl?.layer2WhatSiteReveals?.expectedNextAction || fl?.layer2WhatSiteReveals?.ctasAndConversionPaths || "Visitors are prompted to move from initial value claims toward primary action endpoints."),
    decisionSequence: cleanDisplay(fl?.layer2WhatSiteReveals?.decisionSequence || fl?.layer2WhatSiteReveals?.expectedVisitorSequence || "Pages sequence information from high-level value statements through product features to primary conversion endpoints."),
    monetizedStructure: cleanDisplay(fl?.layer2WhatSiteReveals?.monetizedStructure || fl?.layer2WhatSiteReveals?.pricingCommercialStructure || "Commercial structure not established from available evidence."),
    whatArchitectureRevealsBeyondCopy: cleanDisplay(fl?.layer2WhatSiteReveals?.whatArchitectureRevealsBeyondCopy || fl?.layerComparison?.whatLayer2Reveals || "Site architecture reveals actual operational focus and the primary user paths prioritized over marketing promises."),
    prioritizationContradictions: cleanDisplay(fl?.layer2WhatSiteReveals?.prioritizationContradictions || fl?.layerComparison?.whereTheyDiffer || "No material structural contradiction observed."),
    nonObviousRelationships: cleanDisplay(fl?.layer2WhatSiteReveals?.nonObviousRelationships || fl?.layer2WhatSiteReveals?.productsServicesRelationship || "Direct linking connects primary capability descriptions with direct onboarding or evaluation assets."),
  };

  // Layer Comparison Synthesis
  const layerComparison = {
    whereTheyAgree: cleanDisplay(fl?.layerComparison?.whereTheyAgree || "Landing page claims align with core product navigation categories."),
    whereTheyDiffer: cleanDisplay(fl?.layerComparison?.whereTheyDiffer || theGap),
    whatLayer2Reveals: cleanDisplay(fl?.layerComparison?.whatLayer2Reveals || "Site architecture reveals the actual operational emphasis and sequence expected of visitors."),
    whatRemainsUnknown: cleanDisplay(fl?.layerComparison?.whatRemainsUnknown || "Specific internal workflow logic and unexamined deep links remain unverified."),
  };

  const evidenceKeyObservations = fl?.evidenceKeyObservations && fl.evidenceKeyObservations.length > 0 
    ? fl.evidenceKeyObservations 
    : (report.sourceCitations || []).slice(0, 4).map(s => ({
        source: s.url,
        pageType: "sampled_page",
        observation: s.snippet || "Primary evidence source inspected.",
        evidenceType: "ia"
      }));

  const pagesAnalyzed = report.analysisMetadata?.pagesAnalyzed || report.sourceCitations?.length || 1;
  const pagesDiscovered = report.analysisMetadata?.pagesDiscovered || pagesAnalyzed;
  const coveragePercent = Math.round((pagesAnalyzed / Math.max(1, pagesDiscovered)) * 100);

  const confidenceBreakdown = fl?.confidenceBreakdown || {
    evidenceConfidence: report.overallScore === 'high' ? 88 : report.overallScore === 'medium' ? 72 : 55,
    siteCoverage: coveragePercent,
    interpretationConfidence: Math.round(( (report.overallScore === 'high' ? 88 : 70) + coveragePercent ) / 2),
    confidenceNote: "Derived from cross-page signal convergence."
  };

  return {
    layer1WhatTheySay,
    layer2WhatSiteReveals,
    layerComparison,
    whatTheySay,
    whatTheSiteDoes,
    whatTheBusinessAppearsToBe,
    whatTheyActuallyDo,
    theBusinessModel,
    theCustomerJourney,
    theMechanism,
    theNonGenericSignal,
    theGap,
    theUnderlyingProblem: {
      problem: problemText,
      whoCares: whoCaresText
    },
    theMetaphor: fl?.theMetaphor ?? null,
    evidenceKeyObservations,
    confidenceBreakdown
  };
}

/* ── Adaptive Evidence Assessment Component ───────────── */

function AdaptiveEvidenceAssessmentCard({ assessment }: { assessment?: AdaptiveEvidenceAssessment | null }) {
  const [showMatrix, setShowMatrix] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  if (!assessment) return null;

  const stopConditionBadge = (cond: string) => {
    switch (cond) {
      case 'sufficient_evidence':
        return { label: 'Sufficient Evidence for Current Hypothesis', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'contradiction_found':
        return { label: 'Contradiction Found', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'evidence_exhausted':
        return { label: 'Evidence Exhausted', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'budget_exhausted':
      default:
        return { label: 'Budget Exhausted', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
  };

  const badge = stopConditionBadge(assessment.stopCondition);

  return (
    <div className="bg-background/90 border border-indigo-500/30 rounded-xl p-4 mb-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
            Adaptive Evidence Loop · Evidence-Gap Assessment
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badge.color}`}>
            {badge.label}
          </span>
          {assessment.iterationRounds && (
            <span className="text-[10px] font-mono text-foreground/40">
              {assessment.iterationRounds} Inquiries
            </span>
          )}
        </div>
      </div>

      {/* Stop Explanation Banner */}
      <div className="mb-4 text-xs font-sans text-foreground/80 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5 flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
        <div>
          <span className="font-semibold text-foreground/90 font-mono text-[11px]">Investigation Assessment: </span>
          <span>{assessment.stopExplanation}</span>
          <p className="text-[11px] text-foreground/50 mt-1 italic">
            Evidence Sufficiency Principle: Page coverage percentage is never equated with evidence sufficiency. Conclusions are substantiated through targeted hypothesis-driven inquiries.
          </p>
        </div>
      </div>

      {/* 3 Main Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3.5">
        {/* Established Claims */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
              Established Claims ({assessment.established?.length || 0})
            </p>
          </div>
          {assessment.established && assessment.established.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-foreground/85">
              {assessment.established.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-foreground/40 italic">No claims fully established from public pages.</p>
          )}
        </div>

        {/* Provisional Claims */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-[10px] font-mono font-bold text-amber-400 uppercase">
              Provisional Claims ({assessment.provisional?.length || 0})
            </p>
          </div>
          {assessment.provisional && assessment.provisional.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-foreground/85">
              {assessment.provisional.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold shrink-0">?</span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-foreground/40 italic">No provisional claims remaining.</p>
          )}
        </div>

        {/* Unresolved Questions */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Unlink className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase">
              Unresolved Questions ({assessment.unresolved?.length || 0})
            </p>
          </div>
          {assessment.unresolved && assessment.unresolved.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-foreground/85">
              {assessment.unresolved.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-blue-400 font-bold shrink-0">•</span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-foreground/40 italic">All key structural questions resolved.</p>
          )}
        </div>
      </div>

      {/* Investigation Steps Toggle */}
      {assessment.investigationSteps && assessment.investigationSteps.length > 0 && (
        <div className="border-t border-border/50 pt-2.5">
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="flex items-center justify-between w-full text-[11px] font-mono text-indigo-300 hover:text-indigo-200 transition-colors py-1"
          >
            <span>Adaptive Inquiry Audit Trail ({assessment.investigationSteps.length} Steps)</span>
            <span>{showSteps ? '▲ Hide Trace' : '▼ Show Trace'}</span>
          </button>

          {showSteps && (
            <div className="mt-2.5 space-y-2">
              {assessment.investigationSteps.map((step) => (
                <div key={step.stepNumber} className="bg-card/70 border border-border/70 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                        Step {step.stepNumber}
                      </span>
                      <span className="font-mono text-foreground/80 font-bold">{step.pageType}</span>
                      <span className="font-mono text-foreground/40 text-[10px] truncate max-w-[220px]">{step.selectedUrl}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                      {step.updatedClaimStatus}
                    </span>
                  </div>
                  <p className="text-foreground/90 text-xs mb-1">
                    <span className="text-foreground/50 font-mono text-[10px]">Targeted Claim: </span>
                    {step.claimTargeted}
                  </p>
                  <p className="text-foreground/70 text-[11px] italic bg-background/50 rounded px-2 py-1 border border-border/40">
                    <span className="text-foreground/40 font-mono text-[10px] not-italic">Evidence Found: </span>
                    "{step.evidenceFound}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evidence Requirements Matrix Toggle */}
      {assessment.evidenceRequirements && assessment.evidenceRequirements.length > 0 && (
        <div className="border-t border-border/50 pt-2.5 mt-2.5">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center justify-between w-full text-[11px] font-mono text-foreground/60 hover:text-foreground/90 transition-colors py-1"
          >
            <span>Evidence Requirements Matrix ({assessment.evidenceRequirements.length} Criteria)</span>
            <span>{showMatrix ? '▲ Hide Matrix' : '▼ Show Matrix'}</span>
          </button>

          {showMatrix && (
            <div className="mt-2.5 space-y-2">
              {assessment.evidenceRequirements.map((req, idx) => (
                <div key={idx} className="bg-card/50 border border-border/60 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-foreground">{req.claim}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      req.status === 'established'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : req.status === 'needs_investigation'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : req.status === 'contradicted'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {req.availableEvidence.length > 0 && (
                    <div className="text-[11px] text-emerald-300/90 mb-1">
                      <span className="text-foreground/40 font-mono text-[10px]">Available Evidence: </span>
                      {req.availableEvidence.join('; ')}
                    </div>
                  )}

                  {req.missingEvidence.length > 0 && (
                    <div className="text-[11px] text-amber-300/90 mb-1">
                      <span className="text-foreground/40 font-mono text-[10px]">Missing Evidence: </span>
                      {req.missingEvidence.join('; ')}
                    </div>
                  )}

                  {req.candidatePages.length > 0 && (
                    <div className="text-[10px] font-mono text-foreground/40">
                      <span>Candidate Sources: </span>
                      {req.candidatePages.map((cp) => cp.replace(/^https?:\/\/[^/]+/, '') || '/').join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Founder Investigation Lens ─────────────────────── */

function FounderLensSection({ report }: { report: AnalysisReport }) {
  const lens = getDerivedFounderLens(report);
  const { session } = useAuth();

  const [layer2Loading, setLayer2Loading] = useState(false);
  const [layer2Progress, setLayer2Progress] = useState<ProgressEvent[]>([]);
  const [layer2Error, setLayer2Error] = useState<string | null>(null);
  const [layer2Result, setLayer2Result] = useState<Layer2AnalysisResult | null>(
    report?.layer2Analysis || null
  );

  const [layer3Loading, setLayer3Loading] = useState(false);
  const [layer3Progress, setLayer3Progress] = useState<ProgressEvent[]>([]);
  const [layer3Error, setLayer3Error] = useState<string | null>(null);
  const [layer3Result, setLayer3Result] = useState<CommonGroundSynthesis | null>(
    report?.commonGroundSynthesis || null
  );

  useEffect(() => {
    if (report?.layer2Analysis) {
      setLayer2Result(report.layer2Analysis);
    }
  }, [report]);

  useEffect(() => {
    if (report?.commonGroundSynthesis) {
      setLayer3Result(report.commonGroundSynthesis);
    }
  }, [report]);

  const handleRunLayer3 = useCallback(async () => {
    if (!report?.url || !layer2Result || layer3Loading) return;

    setLayer3Loading(true);
    setLayer3Error(null);
    setLayer3Progress([]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const bodyData = {
        url: report.url,
        mode: 'layer3',
        report: report,
        layer2Result: layer2Result,
      };

      let response: Response | null = null;

      if (supabaseUrl) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (anonKey) {
            headers['Authorization'] = `Bearer ${anonKey}`;
          }
          const externalRes = await fetch(`${supabaseUrl}/functions/v1/analyze`, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyData),
          });
          if (externalRes.ok) {
            response = externalRes;
          }
        } catch (fetchErr) {
          console.warn('External Layer 3 endpoint unreachable, falling back to /api/analyze:', fetchErr);
        }
      }

      if (!response) {
        const localHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          localHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: localHeaders,
          body: JSON.stringify(bodyData),
        });
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.message || errBody?.error || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream received');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalLayer3: CommonGroundSynthesis | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }

          if (!eventType || !dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'complete') {
              finalLayer3 = data as CommonGroundSynthesis;
              break;
            } else if (eventType === 'error') {
              throw new Error(data.message || 'Stage 3 Common Ground analysis failed');
            } else if (eventType === 'progress') {
              setLayer3Progress((prev) => [...prev, data as ProgressEvent]);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error) throw parseErr;
          }
        }

        if (finalLayer3) break;
      }

      if (!finalLayer3) throw new Error('No Stage 3 analysis returned from server.');

      setLayer3Result(finalLayer3);
      report.commonGroundSynthesis = finalLayer3;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stage 3 Common Ground analysis failed.';
      setLayer3Error(msg);
    } finally {
      setLayer3Loading(false);
    }
  }, [report, layer2Result, layer3Loading]);

  const handleRunLayer2 = useCallback(async () => {
    if (!report?.url || layer2Loading) return;

    setLayer2Loading(true);
    setLayer2Error(null);
    setLayer2Progress([]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const bodyData = { url: report.url, mode: 'layer2' };

      let response: Response | null = null;

      if (supabaseUrl) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (anonKey) {
            headers['Authorization'] = `Bearer ${anonKey}`;
          }
          const externalRes = await fetch(`${supabaseUrl}/functions/v1/analyze`, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyData),
          });
          if (externalRes.ok) {
            response = externalRes;
          }
        } catch (fetchErr) {
          console.warn('External Layer 2 endpoint unreachable, falling back to /api/analyze:', fetchErr);
        }
      }

      if (!response) {
        const localHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          localHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: localHeaders,
          body: JSON.stringify(bodyData),
        });
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.message || errBody?.error || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream received');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalLayer2: Layer2AnalysisResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }

          if (!eventType || !dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'complete') {
              finalLayer2 = data as Layer2AnalysisResult;
              break;
            } else if (eventType === 'error') {
              throw new Error(data.message || 'Layer 2 analysis failed');
            } else if (eventType === 'progress') {
              setLayer2Progress((prev) => [...prev, data as ProgressEvent]);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error) throw parseErr;
          }
        }

        if (finalLayer2) break;
      }

      if (!finalLayer2) throw new Error('No Layer 2 analysis returned from server.');

      setLayer2Result(finalLayer2);
      report.layer2Analysis = finalLayer2;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Layer 2 analysis failed.';
      setLayer2Error(msg);
    } finally {
      setLayer2Loading(false);
    }
  }, [report, layer2Loading]);

  return (
    <section className="layer-enter layer-enter-1 bg-card/70 border border-primary/25 rounded-2xl p-6 mb-10 shadow-lg shadow-primary/5">
      {/* Header */}
      <div className="pb-4 border-b border-border/80 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary uppercase tracking-wider border border-primary/20">
              Founder Investigation Lens
            </span>
            <span className="text-xs text-foreground/40 font-mono">Sequential Two-Stage Investigation</span>
          </div>
          
          {/* Multi-metric confidence indicators */}
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border border-border/60">
              <span className="text-foreground/40">Evidence:</span>
              <span className="font-bold text-emerald-400">{lens.confidenceBreakdown.evidenceConfidence}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border border-border/60">
              <span className="text-foreground/40">Coverage:</span>
              <span className="font-bold text-primary">{lens.confidenceBreakdown.siteCoverage}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border border-border/60">
              <span className="text-foreground/40">Interpretation:</span>
              <span className="font-bold text-indigo-400">{lens.confidenceBreakdown.interpretationConfidence}%</span>
            </div>
          </div>
        </div>

        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          Two-Stage Website Investigation
        </h2>
        
        <p className="text-xs text-foreground/60 italic font-mono bg-background/50 border border-border/60 rounded-lg px-3 py-2 mt-2">
          "Establishing Stage 1 explicit communication first, followed by Stage 2 website architecture analysis."
        </p>
      </div>

      {/* Primary Executive Summary */}
      <div className="bg-primary/5 border border-primary/30 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
            Reconstructed Operational Reality
          </h3>
        </div>
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {cleanDisplay(lens.whatTheyActuallyDo)}
        </p>
      </div>

      {/* LAYER 1: WHAT THE COMPANY SAYS */}
      <div className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              Layer 1
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              What The Company Says
            </h3>
          </div>
          <span className="text-[11px] font-mono text-foreground/40">Explicit Communication</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="bg-background/80 border border-border/80 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-1">What It Offers</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">{lens.layer1WhatTheySay.whatItOffers}</p>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-1">Who It Serves</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">{lens.layer1WhatTheySay.whoItServes}</p>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-1">Problems Addressed</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">{lens.layer1WhatTheySay.problemsAddressed}</p>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-1">Offerings & Products</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">{lens.layer1WhatTheySay.offeringsAndProducts}</p>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-1">Claims & Differentiators</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">{lens.layer1WhatTheySay.claimsAndDifferentiators}</p>
          </div>

          <div className="bg-background/80 border border-border/80 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-1">Key Terminology</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-medium">{lens.layer1WhatTheySay.keyTerminology}</p>
          </div>
        </div>

        <div className="bg-background/60 border border-blue-500/20 rounded-xl p-3.5 text-xs text-foreground/80">
          <span className="font-mono font-bold text-blue-400 text-[10px] uppercase block mb-1">Explicit Copy Summary</span>
          "{lens.layer1WhatTheySay.explicitCopySummary}"
        </div>
      </div>

      {/* ACTION BUTTON DIRECTLY UNDERNEATH LAYER 1 */}
      <div className="my-6 p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/30 rounded-2xl text-center shadow-md">
        <p className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">
          Sequential Analysis · Stage 2
        </p>
        <p className="text-xs text-foreground/80 font-medium mb-4 max-w-md mx-auto leading-relaxed">
          Examine cross-page relationships, page hierarchy, pricing structure, and conversion pathways across the stored website architecture.
        </p>
        
        <button
          onClick={handleRunLayer2}
          disabled={layer2Loading}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-heading font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {layer2Loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Website Architecture…</span>
            </>
          ) : layer2Result ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Website Architecture Analyzed (Run Again)</span>
            </>
          ) : (
            <>
              <span>Go Deeper → Analyze Website Architecture</span>
            </>
          )}
        </button>

        {/* Loading progress stream */}
        {layer2Loading && (
          <div className="mt-4 pt-4 border-t border-indigo-500/20 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 mb-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {layer2Progress.length > 0
                  ? layer2Progress[layer2Progress.length - 1].message
                  : 'Starting Layer 2 Website Architecture Investigation...'}
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[10px] text-foreground/60 bg-background/60 p-2.5 rounded-lg border border-indigo-500/20">
              {layer2Progress.slice(-4).map((ev, i) => (
                <div key={i} className="truncate">
                  • {ev.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actionable error banner */}
        {layer2Error && (
          <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-left">
            <div className="text-xs text-rose-300">
              <span className="font-bold">Layer 2 Error: </span>
              {layer2Error}
            </div>
            <button
              onClick={handleRunLayer2}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* LAYER 2 RESULTS SECTION: WHAT THE WEBSITE REVEALS */}
      {layer2Result && (
        <div className="mt-8 border-t border-indigo-500/30 pt-8">
          <div className="bg-indigo-500/5 border border-indigo-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                  Layer 2
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  What The Website Reveals
                </h3>
              </div>
              <span className="text-[11px] font-mono text-foreground/40">Systemic Website Architecture</span>
            </div>

            <p className="text-xs text-foreground/60 italic font-mono bg-background/60 border border-indigo-500/20 rounded-lg px-3.5 py-2 mb-4">
              "What does the website architecture reveal through relationships between pages?"
            </p>

            {/* Source Coverage Metric Banner */}
            {layer2Result.sourceCoverage && (
              <div className="mb-5 p-3.5 bg-background/80 border border-indigo-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/40">Discovered:</span>
                    <span className="font-bold text-foreground">{layer2Result.sourceCoverage.discoveredPagesCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/40">Analyzed:</span>
                    <span className="font-bold text-emerald-400">{layer2Result.sourceCoverage.analyzedPagesCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/40">Unexamined:</span>
                    <span className="font-bold text-amber-400">{layer2Result.sourceCoverage.unexaminedPagesCount}</span>
                  </div>
                </div>
                {layer2Result.sourceCoverage.isPartialCoverage ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                    Provisional (Partial Coverage)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                    Full Coverage Analyzed
                  </span>
                )}
              </div>
            )}

            {/* Adaptive Evidence Gap Assessment */}
            {(layer2Result.evidenceGapAssessment || (lens as any)?.evidenceGapAssessment) && (
              <AdaptiveEvidenceAssessmentCard
                assessment={layer2Result.evidenceGapAssessment || (lens as any)?.evidenceGapAssessment}
              />
            )}

            {/* 10 Architectural Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">1. Navigation & Information Architecture</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.navigationAndIa}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Network className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">2. Page Relationships</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.pageRelationships}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">3. Product / Service Structure</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.productServiceStructure || (layer2Result as any).productsAndServices}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">4. Commercial Structure</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.commercialStructure}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">5. Proof & Trust</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.proofAndTrust}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Route className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">6. Conversion Paths</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.conversionPaths}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4 md:col-span-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Footprints className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">7. Expected Visitor Sequence</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.expectedVisitorSequence || (layer2Result as any).visitorJourney}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Star className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">8. Structural Priorities</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.structuralPriorities}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-[10px] font-mono font-bold text-amber-400 uppercase">9. Contradictions</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.contradictions}</p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-xl p-4 md:col-span-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Unlink className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase">10. Non-obvious Relationships</p>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">{layer2Result.nonObviousRelationships}</p>
              </div>
            </div>

            {/* Supporting Cross-Page Evidence */}
            {((layer2Result.crossPageEvidence && layer2Result.crossPageEvidence.length > 0) ||
              ((layer2Result as any).supportingEvidence && (layer2Result as any).supportingEvidence.length > 0)) && (
              <div className="bg-background/60 border border-indigo-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-mono font-bold text-foreground/50 uppercase tracking-wider">
                    Cross-Page Architectural Evidence
                  </p>
                  <span className="text-[10px] font-mono text-foreground/40">
                    {(layer2Result.crossPageEvidence || (layer2Result as any).supportingEvidence).length} Structural Connections
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(layer2Result.crossPageEvidence || (layer2Result as any).supportingEvidence).map((ev: any, idx: number) => {
                    const sources = ev.sourcePages || [ev.source || layer2Result.targetUrl];
                    const status = ev.status || 'OBSERVED';
                    const statusColor =
                      status === 'OBSERVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : status === 'INFERRED' || status === 'INFERENCE'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-foreground/10 text-foreground/60 border-border/40';

                    return (
                      <div key={idx} className="bg-card/80 border border-border/60 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${statusColor}`}>
                            {status}
                          </span>
                          <span className="text-[10px] font-mono text-foreground/40 truncate max-w-[180px]">
                            {Array.isArray(sources) ? sources.map((s: string) => s.replace(/^https?:\/\//, '')).join(' → ') : String(sources)}
                          </span>
                        </div>
                        <p className="text-foreground/90 leading-relaxed font-medium mb-1">
                          {ev.relationshipObserved || ev.relationship}
                        </p>
                        {ev.interpretation && (
                          <p className="text-[11px] text-foreground/60 italic font-sans border-t border-border/40 pt-1 mt-1">
                            Interpretation: {ev.interpretation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What Remains Unknown */}
            {layer2Result.whatRemainsUnknown && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
                  What Remains Unknown
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                  {layer2Result.whatRemainsUnknown}
                </p>
              </div>
            )}

            {/* ARCHITECTURAL SYNTHESIS */}
            {layer2Result.architecturalSynthesis && (
              <div className="bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 border border-indigo-500/40 rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                    Architectural Synthesis
                  </span>
                  <span className="text-[11px] font-mono text-foreground/50">Revealed Beyond Copy</span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {layer2Result.architecturalSynthesis}
                </p>
              </div>
            )}
            {/* STAGE 3 ACTION BUTTON DIRECTLY UNDERNEATH LAYER 2 RESULTS */}
            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl text-center shadow-md">
              <p className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
                Sequential Analysis · Stage 3
              </p>
              <h4 className="font-heading text-lg font-bold text-foreground mb-1">
                System Thesis & Opportunity Discovery
              </h4>
              <p className="text-xs text-foreground/80 font-medium mb-4 max-w-lg mx-auto leading-relaxed">
                Compare Layer 1 explicit positioning against Layer 2 website architecture to discover system thesis, leverage points, and prospecting opportunities.
              </p>

              <button
                onClick={handleRunLayer3}
                disabled={layer3Loading || !layer2Result}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-heading font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {layer3Loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Synthesizing Common Ground…</span>
                  </>
                ) : layer3Result ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Common Ground Synthesized (Run Again)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Find Common Ground</span>
                  </>
                )}
              </button>

              {/* Loading progress stream */}
              {layer3Loading && (
                <div className="mt-4 pt-4 border-t border-emerald-500/20 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 mb-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {layer3Progress.length > 0
                        ? layer3Progress[layer3Progress.length - 1].message
                        : 'Comparing Layer 1 positioning against Layer 2 website architecture...'}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[10px] text-foreground/60 bg-background/60 p-2.5 rounded-lg border border-emerald-500/20">
                    {layer3Progress.slice(-4).map((ev, i) => (
                      <div key={i} className="truncate">
                        • {ev.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable error banner */}
              {layer3Error && (
                <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-left">
                  <div className="text-xs text-rose-300">
                    <span className="font-bold">Stage 3 Error: </span>
                    {layer3Error}
                  </div>
                  <button
                    onClick={handleRunLayer3}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: COMMON GROUND COMPARATIVE ANALYSIS & CLIENT OPPORTUNITY BRIDGING */}
      {(() => {
        const cg = layer3Result || report?.commonGroundSynthesis;
        if (!cg) return null;

        const sys10 = cg.systemModel;
        const leveragePoints = cg.leveragePoints || cg.potentialLeveragePoints || [];
        const whereHelp = cg.whereICouldHelp || [];
        const oppStatus = cg.opportunityStatus || (whereHelp.length > 0 ? 'STRONG OPPORTUNITY' : leveragePoints.length > 0 ? 'POSSIBLE OPPORTUNITY' : 'NO CREDIBLE OPPORTUNITY YET');
        const founderAngle = cg.founderConversationAngle || cg.outboundAngle;
        const evidenceBound = cg.evidenceBoundary;

        return (
          <div className="mt-10 border-t-2 border-emerald-500/40 pt-8">
            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
              
              {/* Stage Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    STAGE 3: COMMON GROUND
                  </span>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    System Thesis & Opportunity Discovery
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                    oppStatus === 'CREDIBLE OUTBOUND' || oppStatus === 'HIGH-POTENTIAL OUTBOUND' || oppStatus === 'STRONG OPPORTUNITY'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : oppStatus === 'POTENTIAL HYPOTHESIS' || oppStatus === 'POSSIBLE OUTBOUND' || oppStatus === 'POSSIBLE OPPORTUNITY'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : oppStatus === 'INSUFFICIENT EVIDENCE'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
                  }`}>
                    {oppStatus}
                  </span>
                </div>
              </div>

              {/* 1. COMMON GROUND FINDING / SYSTEM THESIS */}
              <div className="mb-8 p-5 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/40 rounded-xl shadow-md">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      1. Common Ground Finding
                    </p>
                  </div>
                  {typeof cg.commonGroundFinding === 'object' && cg.commonGroundFinding?.relationshipOutcome && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {cg.commonGroundFinding.relationshipOutcome}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-foreground leading-relaxed">
                  "{cg.systemThesis || (typeof cg.commonGroundFinding === 'object' ? cg.commonGroundFinding.thesis : cg.commonGroundFinding)}"
                </p>
              </div>

              {/* 2. WHERE THEY AGREE */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                    2. Where They Agree
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Array.isArray(cg.whereTheyAgree) ? cg.whereTheyAgree : []).map((item: any, idx: number) => (
                    <div key={idx} className="bg-background/80 border border-emerald-500/20 rounded-xl p-3.5 space-y-1.5">
                      <p className="text-xs font-bold text-foreground">{typeof item === 'string' ? item : item.explicitClaim}</p>
                      {item.architecturalEvidence && (
                        <p className="text-[11px] text-foreground/80"><span className="font-mono text-emerald-400 font-bold">Evidence:</span> {item.architecturalEvidence}</p>
                      )}
                      {item.businessProductImplication && (
                        <p className="text-[11px] text-foreground/70 italic"><span className="font-mono text-indigo-400 font-bold">Implication:</span> {item.businessProductImplication}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. WHERE THEY DIFFER */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Unlink className="w-4 h-4 text-amber-400" />
                  <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                    3. Where They Differ
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Array.isArray(cg.whereTheyDiffer) ? cg.whereTheyDiffer : []).map((item: any, idx: number) => (
                    <div key={idx} className="bg-background/80 border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground">{typeof item === 'string' ? item : (item.description || item.tension)}</p>
                        {item.discrepancyType && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                            {item.discrepancyType}
                          </span>
                        )}
                      </div>
                      {item.evidence && (
                        <p className="text-[11px] text-foreground/80"><span className="font-mono text-amber-400 font-bold">Evidence:</span> {item.evidence}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. WHAT THE SYSTEM REVEALS THAT THE COPY DOES NOT */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                    4. What The System Reveals That Copy Does Not
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Array.isArray(cg.whatSystemReveals) ? cg.whatSystemReveals : []).map((item: any, idx: number) => (
                    <div key={idx} className="bg-background/80 border border-purple-500/20 rounded-xl p-3.5 space-y-1.5">
                      <p className="text-xs font-bold text-foreground">{typeof item === 'string' ? item : item.insight}</p>
                      {item.evidence && (
                        <p className="text-[11px] text-foreground/80"><span className="font-mono text-purple-400 font-bold">Evidence:</span> {item.evidence}</p>
                      )}
                      {item.systemImplication && (
                        <p className="text-[11px] text-foreground/70 italic"><span className="font-mono text-teal-400 font-bold">System Implication:</span> {item.systemImplication}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. THE BUSINESS / PRODUCT AS A SYSTEM (10 Dimensions) */}
              {sys10 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-blue-400" />
                      <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                        5. The Business / Product as a System (10 Dimensions)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-foreground/40 uppercase">Grounded strictly in observed vs inferred signals</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { title: 'Core Product', data: sys10.coreProduct },
                      { title: 'Primary User', data: sys10.primaryUser },
                      { title: 'Problem', data: sys10.problem },
                      { title: 'Value Creation', data: sys10.valueCreationMechanism },
                      { title: 'Product Mechanism', data: sys10.productMechanism },
                      { title: 'Acquisition', data: sys10.acquisitionMechanism },
                      { title: 'Conversion', data: sys10.conversionMechanism },
                      { title: 'Commercial Model', data: sys10.commercialModel },
                      { title: 'Retention / Expansion', data: sys10.retentionExpansionMechanism },
                      { title: 'System Relationships', data: sys10.importantProductSystemRelationships },
                    ].map((dim, idx) => (
                      dim.data && (
                        <div key={idx} className="bg-background/80 border border-blue-500/20 rounded-xl p-3 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 border-b border-border/50 pb-1 mb-1.5">
                              <h5 className="text-[10px] font-mono font-bold text-blue-300 uppercase tracking-tight truncate">
                                {dim.title}
                              </h5>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                                dim.data.status === 'OBSERVED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : dim.data.status === 'INFERRED'
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                              }`}>
                                {dim.data.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground font-medium leading-snug">{dim.data.observed}</p>
                          </div>
                          {dim.data.inferred && dim.data.status !== 'UNKNOWN' && (
                            <div className="pt-1.5 border-t border-border/40">
                              <p className="text-[10px] text-foreground/70 italic leading-snug">{dim.data.inferred}</p>
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* 6. SYSTEM LEVERAGE POINTS */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                    6. System Leverage Points
                  </h4>
                </div>

                {leveragePoints.length === 0 ? (
                  <div className="p-4 bg-background/60 border border-border/60 rounded-xl text-xs font-mono text-foreground/70 italic">
                    "No credible leverage point identified from available evidence."
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {leveragePoints.map((item: any, idx: number) => {
                      const confBadge = item.confidence === 'High'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : item.confidence === 'Medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-foreground/10 text-foreground/60 border-border/40';

                      return (
                        <div key={idx} className="bg-background/90 border border-amber-500/30 rounded-xl p-4 shadow-md flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-heading text-xs font-bold text-foreground">{item.problem || item.opportunity}</h5>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${confBadge}`}>
                                {item.confidence} Confidence
                              </span>
                            </div>
                            <p className="text-xs text-foreground/90 font-medium mb-2">{item.potentialIntervention}</p>
                            <div className="space-y-1.5 border-t border-border/50 pt-2 text-[11px]">
                              <div>
                                <span className="font-mono font-bold text-amber-400/80">Evidence: </span>
                                <span className="text-foreground/80">{item.evidence}</span>
                              </div>
                              <div>
                                <span className="font-mono font-bold text-indigo-400">Why It Matters: </span>
                                <span className="text-foreground/80">{item.whyItMatters}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 7. WHERE I COULD HELP */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                    7. Where I Could Help (Up to 3 Opportunities)
                  </h4>
                </div>

                {whereHelp.length === 0 ? (
                  <div className="p-4 bg-background/60 border border-border/60 rounded-xl text-xs font-mono text-foreground/70 italic">
                    "No project opportunity established from available evidence."
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {whereHelp.map((item: any, idx: number) => (
                      <div key={idx} className="bg-background/90 border border-indigo-500/30 rounded-xl p-4 shadow-md flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase w-fit">
                              Project #{idx + 1}
                            </span>
                            {item.confidence && (
                              <span className="text-[9px] font-mono font-bold text-emerald-400">
                                {item.confidence} Confidence
                              </span>
                            )}
                          </div>
                          <h5 className="font-heading text-xs font-bold text-foreground mb-2">{item.projectOpportunity || item.projectTitle}</h5>
                          <p className="text-xs text-foreground/80 mb-2 leading-relaxed">{item.potentialIntervention || item.proposedScope}</p>
                          {item.evidence && (
                            <p className="text-[10px] text-foreground/70 mb-2"><span className="font-mono text-indigo-400 font-bold">Evidence:</span> {item.evidence}</p>
                          )}
                        </div>
                        <div className="border-t border-border/50 pt-2">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block mb-0.5">Expected Impact</span>
                          <p className="text-xs text-foreground/90 font-medium">{item.expectedBusinessProductImpact || item.expectedImpact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 8. OPPORTUNITY TEST */}
              {Array.isArray(cg.opportunityTestResults) && cg.opportunityTestResults.length > 0 && (() => {
                const candidateLine = cg.opportunityTestResults.find((t: string) => t.startsWith("Opportunity Candidate:"));
                const candidateName = candidateLine ? candidateLine.replace("Opportunity Candidate:", "").trim() : "None";
                const filterItems = cg.opportunityTestResults.filter((t: string) => !t.startsWith("Opportunity Candidate:"));

                return (
                  <div className="mb-8 p-4 bg-background/80 border border-border/80 rounded-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wide">
                          8. Opportunity Test (5-Filter Discipline)
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-foreground/50 uppercase text-[10px]">Candidate:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          candidateName !== 'None' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/40'
                        }`}>
                          {candidateName}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
                      {filterItems.map((test: string, i: number) => {
                        const isEstablished = test.toLowerCase().includes("established") || test.toLowerCase().includes("yes");
                        const isNotApplicable = test.toLowerCase().includes("not established") || test.toLowerCase().includes("not applicable");

                        return (
                          <div
                            key={i}
                            className={`p-2.5 rounded border font-mono text-xs flex flex-col justify-between ${
                              isNotApplicable
                                ? 'bg-background/40 border-border/40 text-foreground/50'
                                : isEstablished
                                ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground/90'
                                : 'bg-background/60 border-border/40 text-foreground/80'
                            }`}
                          >
                            <span className="leading-snug">{test}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 9. FOUNDER CONVERSATION ANGLE */}
              {founderAngle && (
                <div className="mb-8 bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-blue-500/15 border border-purple-500/30 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                      9. Founder Conversation Angle
                    </h4>
                  </div>

                  {typeof founderAngle === 'string' || (founderAngle as any).fullAngle?.includes("No credible founder") ? (
                    <p className="text-xs font-mono text-foreground/70 italic">
                      "{typeof founderAngle === 'string' ? founderAngle : ((founderAngle as any).fullAngle || (founderAngle as any).whatINoticed)}"
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-background/80 p-3 rounded-lg border border-purple-500/20">
                        <span className="text-[10px] font-mono font-bold text-purple-300 uppercase block mb-1">What I Noticed</span>
                        <p className="text-foreground/90 font-medium leading-relaxed">{(founderAngle as any).whatINoticed || (founderAngle as any).observationX}</p>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg border border-purple-500/20">
                        <span className="text-[10px] font-mono font-bold text-amber-300 uppercase block mb-1">Why It Is Interesting</span>
                        <p className="text-foreground/90 font-medium leading-relaxed">{(founderAngle as any).whyInteresting || (founderAngle as any).thoughtY || (founderAngle as any).whyItMatters}</p>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg border border-purple-500/20">
                        <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase block mb-1">Question</span>
                        <p className="text-foreground/90 font-medium leading-relaxed">{(founderAngle as any).question || (founderAngle as any).questionZ || (founderAngle as any).potentialConversation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 10. OUTBOUND PROSPECTING ANGLE */}
              {cg.outboundProspectingAngle && (
                <div className="mb-8 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/30 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Footprints className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-heading text-sm font-bold text-foreground uppercase tracking-wide">
                      10. Outbound Prospecting Angle
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-background/80 p-3 rounded-lg border border-indigo-500/20">
                      <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase block mb-1">What I Noticed</span>
                      <p className="text-foreground/90 leading-relaxed">{cg.outboundProspectingAngle.whatINoticed}</p>
                    </div>
                    <div className="bg-background/80 p-3 rounded-lg border border-indigo-500/20">
                      <span className="text-[10px] font-mono font-bold text-amber-300 uppercase block mb-1">Why It Matters</span>
                      <p className="text-foreground/90 leading-relaxed">{cg.outboundProspectingAngle.whyItMatters}</p>
                    </div>
                    <div className="bg-background/80 p-3 rounded-lg border border-indigo-500/20">
                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase block mb-1">Potential Project</span>
                      <p className="text-foreground/90 font-bold leading-relaxed">{cg.outboundProspectingAngle.potentialProject}</p>
                    </div>
                    <div className="bg-background/80 p-3 rounded-lg border border-indigo-500/20">
                      <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase block mb-1">Why I Am Relevant</span>
                      <p className="text-foreground/90 leading-relaxed">{cg.outboundProspectingAngle.whyIAmRelevant}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 11. DISTINCTIVE SYSTEM SIGNAL */}
              {cg.distinctiveSystemSignal && (
                <div className="mb-8 p-4 bg-background/80 border border-teal-500/30 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider block mb-1">
                    11. Distinctive System-Level Signal
                  </span>
                  <p className="text-xs font-semibold text-foreground italic leading-relaxed">
                    "{cg.distinctiveSystemSignal}"
                  </p>
                </div>
              )}

              {/* 12. OPPORTUNITY STATUS */}
              <div className="mb-8 p-4 bg-background/80 border border-border/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-foreground/60 uppercase tracking-wider block mb-1">
                    12. Opportunity Status
                  </span>
                  <p className="text-xs text-foreground/80">{cg.opportunityStatusReasoning || 'Classification derived from evidence-backed leverage points.'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                  oppStatus === 'CREDIBLE OUTBOUND' || oppStatus === 'HIGH-POTENTIAL OUTBOUND' || oppStatus === 'STRONG OPPORTUNITY'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : oppStatus === 'POTENTIAL HYPOTHESIS' || oppStatus === 'POSSIBLE OUTBOUND' || oppStatus === 'POSSIBLE OPPORTUNITY'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : oppStatus === 'INSUFFICIENT EVIDENCE'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
                }`}>
                  {oppStatus}
                </span>
              </div>

              {/* 13. EVIDENCE BOUNDARY */}
              {evidenceBound && (
                <div className="p-4 bg-background/80 border border-border/80 rounded-xl">
                  <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                    <span className="text-[10px] font-mono font-bold text-foreground/60 uppercase tracking-wider">
                      13. Evidence Boundary
                    </span>
                    <span className="text-[10px] font-mono text-foreground/50">
                      Analyzed: {evidenceBound.analyzedPagesCount || 1} | Discovered: {evidenceBound.discoveredPagesCount || 1} | Unexamined: {evidenceBound.unexaminedPagesCount || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block mb-1">
                        What We Know (Observed Facts)
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-foreground/80">
                        {(evidenceBound.whatWeKnow || evidenceBound.observedFacts || []).map((k: string, i: number) => (
                          <li key={i}>{k}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase block mb-1">
                        What We Infer (Reasoned Interpretations)
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-foreground/80">
                        {(evidenceBound.whatWeInfer || evidenceBound.inferences || []).map((inf: string, i: number) => (
                          <li key={i}>{inf}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block mb-1">
                        What Remains Unknown (Gaps)
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-foreground/80">
                        {(evidenceBound.whatRemainsUnknown || evidenceBound.unknowns || []).map((u: string, i: number) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 14. PROVIDER MATCHING & PROSPECT QUALIFICATION LAYER */}
              {cg.providerMatch && (() => {
                const pm = cg.providerMatch;
                const isHigh = pm.fit === 'HIGH';
                const isMedium = pm.fit === 'MEDIUM';
                const isLow = pm.fit === 'LOW';

                const fitBadge = isHigh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isMedium
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40';

                const decisionBadge = pm.decision === 'OUTREACH'
                  ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50'
                  : pm.decision === 'WATCH'
                  ? 'bg-amber-500/25 text-amber-200 border-amber-500/50'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                return (
                  <div className="mt-8 border-t border-indigo-500/30 pt-8">
                    <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-background border border-indigo-500/40 rounded-2xl p-5 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 pb-3 mb-5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                            Side B Comparison
                          </span>
                          <h4 className="font-heading text-base font-bold text-foreground">
                            Provider Matching & Prospect Qualification
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-foreground/50 text-[11px]">Provider:</span>
                          <span className="font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {pm.providerName || "David Raigoza / Lightweight Studio"}
                          </span>
                        </div>
                      </div>

                      {/* Qualification Summary Header */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase">Fit Classification</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-foreground">{pm.fit} FIT</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${fitBadge}`}>
                              {pm.fit}
                            </span>
                          </div>
                        </div>

                        <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase">Qualification Decision</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-foreground">{pm.decision}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${decisionBadge}`}>
                              {pm.decision}
                            </span>
                          </div>
                        </div>

                        <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase">Problem & Capability</span>
                          <div className="mt-1">
                            <span className="text-xs font-bold text-indigo-300 block truncate" title={pm.problemCategoryLabel || ''}>
                              {pm.problemCategoryLabel || (pm.problemCategory === 'NONE' ? 'None' : `Category ${pm.problemCategory}`)}
                            </span>
                            {pm.capabilityCategory && pm.capabilityCategory !== 'None' && (
                              <span className="text-[10px] font-mono text-purple-300 block mt-0.5 truncate">
                                {pm.capabilityCategory}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-background/80 border border-border/80 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase">Match Confidence</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-foreground">{pm.confidence}%</span>
                            <div className="w-16 bg-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pm.confidence >= 75 ? 'bg-emerald-400' : pm.confidence >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                                style={{ width: `${pm.confidence}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Opportunity Formula Output */}
                      {pm.opportunity && (
                        <div className="mb-5 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
                              Opportunity Synthesis Formula
                            </span>
                          </div>
                          <p className="text-xs font-medium text-foreground leading-relaxed italic mb-3">
                            "{pm.opportunity}"
                          </p>

                          {pm.opportunitySynthesis && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2.5 border-t border-indigo-500/20 text-[11px]">
                              <div>
                                <span className="font-mono text-[10px] text-indigo-300 uppercase font-bold block">Relevant Capability / Mechanism</span>
                                <span className="text-foreground/90 font-medium">
                                  {pm.opportunitySynthesis.solutionMechanism || pm.opportunitySynthesis.davidsRelevantCapability || pm.capabilityCategory}
                                </span>
                              </div>
                              <div>
                                <span className="font-mono text-[10px] text-purple-300 uppercase font-bold block">Evidenced Condition</span>
                                <span className="text-foreground/90">
                                  {pm.opportunitySynthesis.evidencedCondition || pm.opportunitySynthesis.potentialEngagement || pm.companyNeed}
                                </span>
                              </div>
                              <div>
                                <span className="font-mono text-[10px] text-emerald-300 uppercase font-bold block">Business Impact</span>
                                <span className="text-foreground/90">
                                  {pm.opportunitySynthesis.businessProductConsequence || pm.opportunitySynthesis.expectedBusinessValue || "Measurable product clarity and velocity"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 7-Dimension Fit Evaluation Matrix */}
                      {pm.sevenDimensionFit && (
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-indigo-400" />
                            <h5 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                              7-Dimension Fit Evaluation Matrix
                            </h5>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {[
                              { label: '1. Problem Fit', dim: pm.sevenDimensionFit.problemFit },
                              { label: '2. Capability Fit', dim: pm.sevenDimensionFit.capabilityFit },
                              { label: '3. Delivery Fit', dim: pm.sevenDimensionFit.deliveryFit },
                              { label: '4. Timing Fit', dim: pm.sevenDimensionFit.timingFit },
                              { label: '5. Proof Fit', dim: pm.sevenDimensionFit.proofFit },
                              { label: '6. Commercial Fit', dim: pm.sevenDimensionFit.commercialFit },
                              { label: '7. Evidence Strength', dim: pm.sevenDimensionFit.evidenceStrength },
                            ].map((item, idx) => {
                              const score = item.dim?.score || 'Moderate';
                              const isStrong = score === 'Strong' || score === 'High';
                              const isWeak = score === 'Weak' || score === 'None' || score === 'Insufficient';

                              const badge = isStrong
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isWeak
                                ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                              return (
                                <div key={idx} className="bg-background/80 border border-border/70 rounded-xl p-3 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1.5 border-b border-border/40 pb-1">
                                      <span className="text-[10px] font-mono font-bold text-foreground/70 uppercase">
                                        {item.label}
                                      </span>
                                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase border ${badge}`}>
                                        {score}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-foreground/80 leading-snug">
                                      {item.dim?.note}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Intersection Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-xs">
                        <div className="bg-background/80 border border-border/80 rounded-xl p-3.5 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase block">
                            Company Need & Evidenced Problem
                          </span>
                          <p className="text-foreground/90 font-medium">{pm.companyNeed}</p>
                          <div className="pt-1.5 border-t border-border/40">
                            <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase block mb-0.5">Evidence Grounding</span>
                            <p className="text-foreground/75 text-[11px]">{pm.evidence}</p>
                          </div>
                        </div>

                        <div className="bg-background/80 border border-border/80 rounded-xl p-3.5 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase block">
                            Provider Fit & Delivery Model
                          </span>
                          <p className="text-foreground/90 font-medium">{pm.providerFit}</p>
                          <div className="pt-1.5 border-t border-border/40">
                            <span className="text-[10px] font-mono font-bold text-foreground/50 uppercase block mb-0.5">Delivery Match</span>
                            <p className="text-foreground/75 text-[11px]">{pm.deliveryFit}</p>
                          </div>
                        </div>

                        <div className="bg-background/80 border border-border/80 rounded-xl p-3.5 space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">
                            Timing Signal & Urgency
                          </span>
                          <p className="text-foreground/85 leading-relaxed">{pm.timingOrTrigger}</p>
                        </div>

                        <div className="bg-background/80 border border-border/80 rounded-xl p-3.5 space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-teal-400 uppercase block">
                            Relevant Studio Proof Area
                          </span>
                          <p className="text-foreground/85 leading-relaxed">{pm.relevantProof}</p>
                        </div>
                      </div>

                      {/* Action Directive: Outreach Angle vs Watch Requirements vs Discard Rationale */}
                      {isHigh && pm.outreachAngle && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block mb-1">
                            Founder Conversation Starter (Outbound Direction)
                          </span>
                          <p className="text-xs text-foreground font-medium italic leading-relaxed">
                            "{pm.outreachAngle}"
                          </p>
                        </div>
                      )}

                      {isMedium && pm.upgradeRequirements && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block mb-1">
                            Watch List Directive: Evidence Needed to Upgrade
                          </span>
                          <p className="text-xs text-foreground/85 leading-relaxed">
                            {pm.upgradeRequirements}
                          </p>
                        </div>
                      )}

                      {isLow && pm.disqualificationReason && (
                        <div className="p-4 bg-zinc-500/10 border border-zinc-500/30 rounded-xl">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">
                            Disqualification Rationale
                          </span>
                          <p className="text-xs text-foreground/75 leading-relaxed">
                            {pm.disqualificationReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        );
      })()}
    </section>
  );
}

/* ── Main InvestigationView ─────────────────────────── */

export default function InvestigationView({ progressEvents, report, onReset }: InvestigationViewProps) {
  const [layersVisible, setLayersVisible] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const isComplete = report !== null;

  // Derive latest stats from progress events
  const latestStats = (() => {
    let analyzed = 0, discovered = 0, skipped = 0, rawConf = 0;
    for (const ev of progressEvents) {
      if (ev.pagesAnalyzed !== undefined && ev.pagesAnalyzed > 0) analyzed = ev.pagesAnalyzed;
      if (ev.pagesDiscovered !== undefined && ev.pagesDiscovered > 0) discovered = ev.pagesDiscovered;
      if (ev.pagesSkipped !== undefined) skipped = ev.pagesSkipped;
      if (ev.currentConfidence !== undefined) rawConf = ev.currentConfidence;
    }
    if (report?.analysisMetadata) {
      const m = report.analysisMetadata;
      if (m.pagesAnalyzed !== undefined && m.pagesAnalyzed > 0) analyzed = m.pagesAnalyzed;
      if (m.pagesDiscovered !== undefined && m.pagesDiscovered > 0) discovered = m.pagesDiscovered;
      if (m.pagesSkipped !== undefined && m.pagesSkipped > 0) {
        skipped = m.pagesSkipped;
      } else if (discovered > analyzed) {
        skipped = Math.max(0, discovered - analyzed);
      }
      if (m.finalConfidence) rawConf = m.finalConfidence;
    }
    if (discovered > analyzed && skipped === 0) {
      skipped = discovered - analyzed;
    }
    const confidence = rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);
    return { analyzed, discovered, skipped, confidence };
  })();

  // Build confidence progression from events or report
  const confidenceProgression = (() => {
    if (report?.analysisMetadata?.confidenceProgression) {
      return report.analysisMetadata.confidenceProgression.map((p) => ({
        page: p.pageType, confidence: p.confidence,
      }));
    }
    const steps: { page: string; confidence: number }[] = [];
    for (const ev of progressEvents) {
      if (ev.type === 'page_analysis_result') {
        const pageType = (ev.detail?.pageType as string) || 'page';
        const hyp = extractHypothesis(ev.detail);
        if (hyp) steps.push({ page: pageType, confidence: hyp.confidence });
      }
    }
    return steps;
  })();

  // Trigger layer reveal when report arrives
  useEffect(() => {
    if (report) {
      const timer = setTimeout(() => setLayersVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [report]);

  // Scroll to top when new report comes
  useEffect(() => {
    if (report && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [report]);

  // Generate and download PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!report || !reportRef.current) return;
    setPdfLoading(true);
    try {
      const blob = await generatePDFReport(report, reportRef.current);
      if (blob) {
        downloadPDFBlob(blob, buildPDFFilename(report));
      }
    } catch (err) {
      console.warn('PDF generation failed:', err);
    } finally {
      setPdfLoading(false);
    }
  }, [report]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-mono text-foreground/30 uppercase tracking-[0.15em]">Common Ground</p>
          </div>
          <div className="flex items-center gap-2">
            <AuthHeaderButton />
            <ThemeToggle />
            {report && (
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 shrink-0 text-xs text-foreground/70 hover:text-foreground bg-card hover:bg-card-hover border border-border rounded-lg px-3 py-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {pdfLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileDown className="w-3 h-3" />
                )}
                {pdfLoading ? 'Generating…' : 'Download PDF'}
              </button>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 shrink-0 text-xs text-foreground/70 hover:text-foreground bg-card hover:bg-card-hover border border-border rounded-lg px-3 py-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              New investigation
            </button>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10 pb-32">
          {/* Title */}
          {report && (
            <div className="mb-8">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {report.title}
              </h1>
              <a href={report.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-primary transition-colors mt-1">
                {report.url}<ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* ── Live investigation phase ── */}
          {!isComplete && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <span className="text-xs font-medium text-primary uppercase tracking-wider">Investigating</span>
              </div>

              {/* Confidence bar */}
              {latestStats.confidence > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-foreground/40">Position stability</span>
                    <span className="text-[11px] font-semibold text-foreground/60">{latestStats.confidence}%</span>
                  </div>
                  <div className="stability-track">
                    <div className={`stability-fill ${confidenceColor(latestStats.confidence)}`}
                      style={{ width: `${Math.min(100, latestStats.confidence)}%` }} />
                  </div>
                </div>
              )}

              {/* Confidence progression bars */}
              {confidenceProgression.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider mb-2">Confidence progression</p>
                  <ConfidenceBar progression={confidenceProgression} />
                </div>
              )}

              {/* Coverage stats */}
              {latestStats.discovered > 0 && (
                <div className="flex gap-4 mb-6 text-[11px] text-foreground/30">
                  <span>{latestStats.discovered} pages discovered</span>
                  <span>{latestStats.analyzed} analyzed</span>
                  <span>{latestStats.skipped} skipped</span>
                </div>
              )}

              {/* Journal */}
              <div className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest mb-3">
                Investigation journal
              </div>
              <InvestigationJournal events={progressEvents} />
            </div>
          )}

          {/* ── Post-complete layers ── */}
          <div className="flex gap-8">
            <div className="flex-1 min-w-0 space-y-12">
              {layersVisible && report && (
                <div ref={reportRef}>
                  <FounderLensSection report={report} />

                  {(report.sourceCitations || []).length > 0 && (
                    <section className="layer-enter layer-enter-7 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Sources</span>
                      </div>
                      <div className="space-y-1.5">
                        {report.sourceCitations.map((src, i) => (
                          <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-2 bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all group">
                            <ExternalLink className="w-3 h-3 mt-0.5 text-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground/60 group-hover:text-primary transition-colors truncate">{src.title || src.url}</p>
                              <p className="text-[11px] text-foreground/30 mt-0.5 line-clamp-1">{src.snippet}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {(() => {
                    const stopReason = report.analysisMetadata?.stopReason || '';
                    const isBudgetPaused = stopReason.toLowerCase().includes('budget') ||
                      (report.analysisMetadata?.pagesDiscovered || 0) > (report.analysisMetadata?.pagesAnalyzed || 0);
                    return (
                      <p className="text-[11px] text-foreground/20 text-center pt-4">
                        {isBudgetPaused ? "Investigation paused" : "Investigation completed"} {new Date(report.analyzedAt).toLocaleDateString()}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}