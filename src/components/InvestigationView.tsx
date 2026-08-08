import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw, ExternalLink, ArrowRight, Search,
  Users, Lightbulb, Award, Layers, FileDown, Loader2,
} from 'lucide-react';
import type { ProgressEvent, AnalysisReport, HypothesisState } from '../types';
import { generatePDFReport, downloadPDFBlob, buildPDFFilename } from '../lib/generatePDF';

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

function stabilityLabel(conf: number): string {
  if (conf >= 90) return 'Stable';
  if (conf >= 75) return 'Converging';
  if (conf >= 50) return 'Developing';
  return 'Emerging';
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
      {progression.map((p, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-mono text-foreground/40">{p.confidence}%</span>
          <div
            className="w-full rounded-t-sm transition-all duration-700 ease-out"
            style={{
              height: `${Math.max(8, (p.confidence / 100) * 56)}px`,
              backgroundColor: p.confidence >= 80
                ? 'var(--color-evidence-high)'
                : p.confidence >= 50
                  ? 'var(--color-evidence-medium)'
                  : 'var(--color-primary)',
              opacity: i === progression.length - 1 ? 1 : 0.5,
            }}
          />
          <span className="text-[8px] text-foreground/30 uppercase truncate max-w-full leading-tight">
            {p.page === 'homepage' ? 'Home' : p.page.slice(0, 6)}
          </span>
        </div>
      ))}
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
                {hyp && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-semibold"
                    style={{
                      color: hyp.confidence >= 80 ? 'var(--color-evidence-high)' :
                             hyp.confidence >= 50 ? 'var(--color-evidence-medium)' :
                             'var(--color-foreground)'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {hyp.confidence}%
                  </span>
                )}
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
          return (
            <div key={i} className="bg-card border border-evidence-high/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <svg viewBox="0 0 10 10" fill="none" stroke="var(--color-evidence-high)" strokeWidth={2} className="w-3 h-3 shrink-0">
                  <path d="M2 5l2 2 4-4" />
                </svg>
                <span className="text-xs font-semibold text-evidence-high">Investigation complete</span>
              </div>
              <p className="text-[11px] text-foreground/50 leading-relaxed">{entry.data.message}</p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

/* ── Post-complete Layers ──────────────────────────── */

function HypothesisLayer({ report }: { report: AnalysisReport }) {
  return (
    <section className="layer-enter layer-enter-1">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 2</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Initial hypothesis</span>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mb-1">Based on the evidence so far…</h2>
      <p className="text-sm text-foreground/50 mb-4">We believe this company is attempting to occupy:</p>
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="font-heading text-lg font-bold text-primary leading-snug">{report.intendedPosition?.description || 'Insufficient data to determine intended position'}</p>
        {report.intendedPosition?.rationale && <p className="text-xs text-foreground/40 mt-2 leading-relaxed italic">{report.intendedPosition.rationale}</p>}
      </div>
    </section>
  );
}

function EvidenceLayer({ report }: { report: AnalysisReport }) {
  const signals = (report.positioningSignals || []).slice(0, 6);
  return (
    <section className="layer-enter layer-enter-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 3</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Supporting evidence</span>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mb-1">How this hypothesis was constructed</h2>
      <p className="text-sm text-foreground/50 mb-5">Each observation contributed to the current understanding.</p>
      <div className="space-y-4">
        {signals.map((signal, i) => {
          const firstEv = signal.evidence?.[0];
          return (
            <div key={signal.id} className="evidence-artifact">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-foreground/25">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">{firstEv?.source || 'Unknown source'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                  signal.signalType === 'philosophy' ? 'border-amber-500/30 text-amber-400/70' :
                  signal.signalType === 'capability' ? 'border-purple-500/30 text-purple-400/70' :
                  signal.signalType === 'credibility' ? 'border-blue-500/30 text-blue-400/70' :
                  'border-rose-500/30 text-rose-400/70'
                }`}>{signal.signalType}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-1.5">"{firstEv?.excerpt || signal.signal}"</p>
              <p className="text-xs text-foreground/50 leading-relaxed flex items-start gap-1.5">
                <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-foreground/30" />
                <span>{signal.contributesToPosition || signal.reasoningNote}</span>
              </p>
            </div>
          );
        })}
      </div>
      {signals.length === 0 && <p className="text-sm text-foreground/50 italic text-center py-6">No evidence artifacts to display.</p>}
    </section>
  );
}

function RevisionLayer({ report }: { report: AnalysisReport }) {
  const versions: { label: string; description: string; note: string }[] = [];
  if (report.intendedPosition) versions.push({ label: 'Version 1', description: report.intendedPosition.description, note: 'Based on what the company communicates directly' });
  if (report.inferredPosition) versions.push({ label: 'Version 2', description: report.inferredPosition.description, note: 'Adjusted after examining evidence across pages' });
  return (
    <section className="layer-enter layer-enter-3">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 4</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Hypothesis evolution</span>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mb-1">How understanding evolved</h2>
      <p className="text-sm text-foreground/50 mb-5">Each page revised the hypothesis as new evidence came to light.</p>
      <div className="space-y-2">
        {versions.map((v, i) => (
          <div key={i}>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-semibold text-primary uppercase">{v.label}</span>
                <span className="text-[10px] text-foreground/30">{v.note}</span>
              </div>
              <p className="text-sm font-medium text-foreground/80 leading-snug">{v.description}</p>
            </div>
            {i < versions.length - 1 && (
              <div className="version-connector py-1">
                <span className="w-0.5 h-4 bg-border rounded" />
                <span className="w-0.5 h-4 bg-border rounded" />
                <span className="w-0.5 h-4 bg-border rounded" />
              </div>
            )}
          </div>
        ))}
      </div>
      {report.earnedPosition && (
        <div className="mt-4 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-semibold text-evidence-high uppercase">Final Assessment</span>
            <span className="text-[10px] text-foreground/30">How well the position is earned</span>
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">{report.earnedPosition.explanation}</p>
        </div>
      )}
    </section>
  );
}

function ContradictionsLayer({ report }: { report: AnalysisReport }) {
  const gaps = report.positioningGaps || [];
  const journey = report.visitorJourney || [];
  const weakJourneyStages = journey.filter((j) => j.effect === 'weakens_position');
  const contradictions = [...gaps, ...weakJourneyStages.map((j) => ({
    area: j.stage, description: j.explanation, impact: 'moderate' as const, gapType: 'messaging_inconsistency' as const,
  }))];
  if (contradictions.length === 0) return null;
  return (
    <section className="layer-enter layer-enter-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 5</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Contradictions</span>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mb-1">What challenges the hypothesis</h2>
      <p className="text-sm text-foreground/50 mb-5">Evidence that weakens or complicates the market position.</p>
      <div className="space-y-3">
        {contradictions.map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{c.area}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                c.impact === 'significant' ? 'bg-evidence-low/20 text-evidence-low border-evidence-low/30' :
                c.impact === 'moderate' ? 'bg-evidence-medium/20 text-evidence-medium border-evidence-medium/30' :
                'bg-foreground/10 text-foreground/40 border-foreground/20'
              }`}>{c.impact}</span>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed">{c.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StabilizationLayer({ report }: { report: AnalysisReport }) {
  const meta = report.analysisMetadata;
  const confidence = meta?.finalConfidence ?? 0;
  const analyzed = meta?.pagesAnalyzed ?? 0;
  const discovered = meta?.pagesDiscovered ?? 0;
  const stopReason = meta?.stopReason ?? 'Completed';
  const progression = meta?.confidenceProgression ?? [];
  const pct = Math.round(confidence * 100);

  const uncertainties: string[] = [];
  if (report.positioningGaps?.length) {
    for (const gap of report.positioningGaps) {
      if (gap.gapType === 'weak_differentiation' && !uncertainties.includes('Competitive differentiation')) uncertainties.push('Competitive differentiation');
      if (gap.gapType === 'audience_ambiguity' && !uncertainties.includes('Target audience')) uncertainties.push('Target audience');
      if (gap.gapType === 'credibility_gap' && !uncertainties.includes('Customer proof')) uncertainties.push('Customer proof');
      if (gap.gapType === 'category_ambiguity' && !uncertainties.includes('Market category')) uncertainties.push('Market category');
    }
  }

  return (
    <section className="layer-enter layer-enter-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 6</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Stabilization</span>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mb-1">Investigation complete</h2>
      <p className="text-sm text-foreground/50 mb-6">No additional evidence would meaningfully change the inferred market position.</p>

      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Position stability</span>
          <span className="font-heading text-xl font-bold text-foreground">{pct}%</span>
        </div>
        <div className="stability-track mb-3">
          <div className={`stability-fill ${confidenceColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <span className="text-[11px] font-medium text-foreground/40">{stabilityLabel(pct)}</span>
        {uncertainties.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[11px] text-foreground/40 mb-2">The remaining uncertainty comes from:</p>
            <ul className="space-y-1">
              {uncertainties.map((u, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground/50">
                  <span className="w-1 h-1 rounded-full bg-foreground/30 shrink-0" />{u}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {progression.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-3">Confidence Progression</p>
          <div className="space-y-2">
            {progression.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-foreground/40 w-20 shrink-0 capitalize truncate">
                  {p.pageType.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${p.confidence}%`,
                    backgroundColor: p.confidence >= 80 ? 'var(--color-evidence-high)' :
                                     p.confidence >= 50 ? 'var(--color-evidence-medium)' : 'var(--color-primary)',
                  }} />
                </div>
                <span className="text-[10px] font-mono font-semibold text-foreground/50 w-8 text-right">{p.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="font-heading text-lg font-bold text-foreground">{discovered}</p>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">Discovered</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="font-heading text-lg font-bold text-foreground">{analyzed}</p>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">Analyzed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="font-heading text-lg font-bold text-foreground">{discovered - analyzed}</p>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">Skipped</p>
        </div>
      </div>

      <div className="mt-3 bg-card border border-border rounded-xl p-3">
        <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5">Why investigation stopped</p>
        <p className="text-xs text-foreground/60 leading-relaxed">{stopReason}</p>
      </div>
    </section>
  );
}

function FinalPositionLayer({ report }: { report: AnalysisReport }) {
  return (
    <section className="layer-enter layer-enter-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 7</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Final synthesis</span>
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground mb-1">Complete market position</h2>
      <p className="text-sm text-foreground/50 mb-6">The reasoning you observed, consolidated.</p>
      {report.positionSummary && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <p className="text-xs text-foreground/40 uppercase tracking-wider mb-2 font-semibold">Summary</p>
          <p className="text-sm text-foreground/80 leading-relaxed italic">"{report.positionSummary}"</p>
        </div>
      )}
      {report.marketSpace && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <p className="text-xs text-foreground/40 uppercase tracking-wider mb-3 font-semibold">Market Space</p>
          <div className="space-y-2.5">
            <MarketSpaceItem label="Primary" space={report.marketSpace.primary?.space || 'Unknown'} rationale={report.marketSpace.primary?.rationale || ''} color="text-evidence-high" />
            {report.marketSpace.secondary && <MarketSpaceItem label="Secondary" space={report.marketSpace.secondary.space} rationale={report.marketSpace.secondary.rationale} color="text-evidence-medium" />}
            {report.marketSpace.emerging && <MarketSpaceItem label="Emerging" space={report.marketSpace.emerging.space} rationale={report.marketSpace.emerging.rationale} color="text-amber-400" />}
          </div>
        </div>
      )}
      {report.positioningClarity && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <p className="text-xs text-foreground/40 uppercase tracking-wider mb-3 font-semibold">Positioning Clarity</p>
          <div className="space-y-2.5">
            {(report.positioningClarity.items || []).slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-[10px] font-mono font-semibold shrink-0 mt-0.5 ${
                  item.clarity === 'explicit' ? 'text-evidence-high' :
                  item.clarity === 'implicit' ? 'text-evidence-medium' :
                  item.clarity === 'ambiguous' ? 'text-amber-400' : 'text-evidence-low'
                }`}>{item.clarity === 'explicit' ? '✓' : item.clarity === 'implicit' ? '→' : item.clarity === 'ambiguous' ? '?' : '×'}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/70">{item.question}</p>
                  <p className="text-[11px] text-foreground/40 mt-0.5">{item.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {(report.positioningRecommendations || []).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-foreground/40 uppercase tracking-wider mb-3 font-semibold">Recommendations</p>
          <div className="space-y-2.5">
            {(report.positioningRecommendations || []).slice(0, 4).map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                  rec.priority === 'high' ? 'text-evidence-low' : rec.priority === 'medium' ? 'text-evidence-medium' : 'text-foreground/40'
                }`}>{rec.priority === 'high' ? 'H' : rec.priority === 'medium' ? 'M' : 'L'}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/70">{rec.action}</p>
                  {rec.observationChain && <p className="text-[11px] text-foreground/40 mt-0.5">{rec.observationChain.observation} → {rec.observationChain.inference}</p>}
                  <p className="text-[11px] text-foreground/30 mt-0.5 italic">{rec.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MarketSpaceItem({ label, space, rationale, color }: { label: string; space: string; rationale: string; color: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] font-mono font-semibold shrink-0 mt-0.5 ${color}`}>{label}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground/70">{space}</p>
        <p className="text-[11px] text-foreground/40 mt-0.5">{rationale}</p>
      </div>
    </div>
  );
}

function ReflectionLayer({ finalQuestion }: { finalQuestion: string }) {
  return (
    <section className="layer-enter layer-enter-7">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono font-semibold text-foreground/30 uppercase tracking-widest">Layer 8</span>
        <span className="text-[10px] text-foreground/20">·</span>
        <span className="text-[10px] font-medium text-foreground/30">Reflection</span>
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-xs text-foreground/40 uppercase tracking-wider mb-3 font-semibold text-center">Final question</p>
        <p className="text-lg font-heading font-bold text-foreground text-center leading-snug">"{finalQuestion}"</p>
      </div>
      <p className="mt-4 text-xs text-foreground/30 text-center leading-relaxed max-w-md mx-auto">
        That is the unique position this company occupies — the space that would be empty without them.
      </p>
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
    let analyzed = 0, discovered = 0, skipped = 0, confidence = 0;
    for (const ev of progressEvents) {
      if (ev.pagesAnalyzed !== undefined) analyzed = ev.pagesAnalyzed;
      if (ev.pagesDiscovered !== undefined) discovered = ev.pagesDiscovered;
      if (ev.pagesSkipped !== undefined) skipped = ev.pagesSkipped;
      if (ev.currentConfidence !== undefined) confidence = ev.currentConfidence;
    }
    if (report?.analysisMetadata) {
      const m = report.analysisMetadata;
      analyzed = m.pagesAnalyzed;
      discovered = m.pagesDiscovered;
      skipped = m.pagesSkipped;
      confidence = Math.round(m.finalConfidence * 100);
    }
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
            {report && (
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 shrink-0 text-xs text-foreground/50 hover:text-foreground bg-card hover:bg-card-hover border border-border rounded-lg px-3 py-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
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
              className="flex items-center gap-1.5 shrink-0 text-xs text-foreground/50 hover:text-foreground bg-card hover:bg-card-hover border border-border rounded-lg px-3 py-1.5 transition-all active:scale-95"
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
                  <HypothesisLayer report={report} />
                  <EvidenceLayer report={report} />
                  <RevisionLayer report={report} />
                  <ContradictionsLayer report={report} />
                  <StabilizationLayer report={report} />
                  <FinalPositionLayer report={report} />
                  {report.finalQuestion && <ReflectionLayer finalQuestion={report.finalQuestion} />}

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

                  <p className="text-[11px] text-foreground/20 text-center pt-4">
                    Investigation completed {new Date(report.analyzedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}