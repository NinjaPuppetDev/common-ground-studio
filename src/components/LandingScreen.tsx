import React, { useState } from 'react';
import {
  Compass,
  Radar,
  Search,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  XCircle,
  Crosshair,
  CheckCircle2,
  Sparkles,
  Database,
  Building2,
  Terminal,
  Activity,
  Globe2,
  GitBranch,
  Filter,
  Check
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import RadarStation from './RadarStation';
import AuthHeaderButton from './AuthHeaderButton';

interface LandingScreenProps {
  onAnalyze: (input: { url: string; userCapabilities?: string }) => void;
  isAnalyzing: boolean;
}

// ── Inline Cartographic / Topographic Background Visuals ──────────────

function TopoGridOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-40 dark:opacity-25">
      {/* Topographic Elevation Curves (SVG) */}
      <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="carto-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-300 dark:text-slate-800"
            />
            <circle cx="24" cy="24" r="0.75" className="fill-slate-400 dark:fill-slate-700" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#carto-grid)" />

        {/* Subtle contour curves */}
        <path
          d="M-100 250 C 300 180, 600 350, 1100 200 C 1400 120, 1700 280, 2100 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 6"
          className="text-slate-300 dark:text-slate-800"
        />
        <path
          d="M-100 450 C 400 320, 700 580, 1200 420 C 1600 300, 1800 520, 2200 460"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-slate-200 dark:text-slate-800/60"
        />
        <path
          d="M-100 680 C 250 600, 850 780, 1300 640 C 1750 520, 1950 720, 2200 680"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          className="text-slate-200 dark:text-slate-800/40"
        />
      </svg>

      {/* Cartographic Coordinate Marks */}
      <div className="absolute top-20 left-6 text-[9px] font-mono text-slate-400 dark:text-slate-600 tracking-widest hidden md:block">
        LAT 42°21'30" N // LON 71°03'35" W
      </div>
      <div className="absolute top-20 right-6 text-[9px] font-mono text-slate-400 dark:text-slate-600 tracking-widest hidden md:block">
        GRID: EPSG:4326 // CALIBRATION: ACTIVE
      </div>
    </div>
  );
}

// ── Main Cartographic Landing Screen Component ────────────────────────

export default function LandingScreen({ onAnalyze, isAnalyzing }: LandingScreenProps) {
  const [context, setContext] = useState('');
  const [prospectUrl, setProspectUrl] = useState('');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'observed' | 'inferred' | 'unknown'>('observed');
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);

  const handleStartInvestigation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectUrl.trim() || isAnalyzing) return;
    onAnalyze({
      url: prospectUrl.trim(),
      userCapabilities: context.trim() || undefined,
    });
  };

  const workflowSteps = [
    {
      num: '01',
      title: 'Discover',
      tag: 'PAGE_MAPPING',
      desc: "Map the organization's available digital presence across public architectural pathways.",
      icon: Search,
    },
    {
      num: '02',
      title: 'Investigate',
      tag: 'EVIDENCE_INGESTION',
      desc: 'Examine the evidence relevant to understanding product, market positioning, and commercial reality.',
      icon: Compass,
    },
    {
      num: '03',
      title: 'Identify Gaps',
      tag: 'UNCERTAINTY_DETECTION',
      desc: 'Determine which claims remain unsupported, ambiguous, or unevidenced.',
      icon: Filter,
    },
    {
      num: '04',
      title: 'Investigate Selectively',
      tag: 'ADAPTIVE_DEEP_DIVE',
      desc: 'Follow targeted evidence paths required to answer the critical operational questions.',
      icon: GitBranch,
    },
    {
      num: '05',
      title: 'Establish Reality',
      tag: 'TRIAD_CLASSIFICATION',
      desc: 'Separate what is observed from what is inferred and what remains unknown.',
      icon: ShieldCheck,
    },
  ];

  const dimensions = [
    {
      title: 'Capabilities',
      meta: 'OPERATIONAL_PROOF',
      desc: 'What each organization can actually do, supported by concrete proof and mechanisms.',
      code: 'CAPABILITY_FIT: OBSERVED',
    },
    {
      title: 'Problems',
      meta: 'EVIDENCED_FRICTION',
      desc: 'What each organization appears to need or be positioned around.',
      code: 'PROBLEM_ALIGN: VALIDATED',
    },
    {
      title: 'Markets',
      meta: 'AUDIENCE_SECTOR',
      desc: 'Who they serve and where their commercial activities intersect.',
      code: 'MARKET_OVERLAP: 84%',
    },
    {
      title: 'Technology',
      meta: 'INFRASTRUCTURE',
      desc: 'Relevant technical capabilities, architecture, and areas of engineering expertise.',
      code: 'TECH_CONTINUITY: HIGH',
    },
    {
      title: 'Products & Services',
      meta: 'OFFERING_PORTFOLIO',
      desc: 'What each organization offers and where those offerings complement one another.',
      code: 'OFFERING_RECIPROCITY: ACTIVE',
    },
    {
      title: 'Evidence',
      meta: 'VERIFIABLE_PROOF',
      desc: 'What can actually be established about the potential fit from grounded artifacts.',
      code: 'EVIDENCE_DENSITY: HIGH',
    },
    {
      title: 'Commercial Context',
      meta: 'TRANSACTION_SIGNALS',
      desc: 'Whether there are meaningful signals that a relationship could make commercial sense.',
      code: 'COMMERCIAL_RATIONALE: VIABLE',
    },
  ];

  const outcomes = [
    {
      title: 'Shared Problems',
      tag: 'DIRECT_ALIGNMENT',
      desc: 'Where your capabilities correspond to an observable, evidenced need in their operation.',
      color: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20',
      icon: CheckCircle2,
    },
    {
      title: 'Complementary Capabilities',
      tag: 'MUTUAL_EXTENSION',
      desc: "Where one organization's capabilities naturally extend the other without conflicting.",
      color: 'border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
      icon: Sparkles,
    },
    {
      title: 'Strategic Overlap',
      tag: 'INTERSECTING_TRAJECTORY',
      desc: 'Where markets, technologies, products, or strategic initiatives intersect constructively.',
      color: 'border-indigo-500/40 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20',
      icon: GitBranch,
    },
    {
      title: 'Evidence-Backed Opportunities',
      tag: 'JUSTIFIED_ENGAGEMENT',
      desc: 'Where enough concrete evidence exists to justify proactive outreach and executive time.',
      color: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20',
      icon: ShieldCheck,
    },
    {
      title: 'Uncertainty',
      tag: 'MORE_EVIDENCE_NEEDED',
      desc: 'Where the relationship looks interesting but essential questions remain unverified.',
      color: 'border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
      icon: HelpCircle,
    },
    {
      title: 'No Credible Opportunity',
      tag: 'DISCARD_RECOMMENDED',
      desc: 'Where the evidence does not justify pursuing the relationship — saving time and reputation.',
      color: 'border-rose-500/40 text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20',
      icon: XCircle,
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200 overflow-x-hidden transition-colors duration-200">
      {/* Topographic Background Geometry */}
      <TopoGridOverlay />

      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
                Common Ground
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block -mt-0.5 font-medium">
                CARTOGRAPHIC POSITIONING ENGINE // v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM_ONLINE [EPSG:4326]
            </span>
            <AuthHeaderButton />
            <ThemeToggle showLabel />
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative z-10 pt-12 pb-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-6 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08] font-heading">
              Find the ground between your company and the companies you want to work with.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Common Ground investigates organizations, understands what they actually do, and identifies where their realities meaningfully overlap.
            </p>

            {/* Dual Input Instrument Box */}
            <form onSubmit={handleStartInvestigation} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {/* 1. Your Context */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-500/60 transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      1. Give Common Ground your company context
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">OPTIONAL</span>
                  </div>
                  <textarea
                    rows={2}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="What you build, core capabilities, technology stack, constraints..."
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono resize-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    Constructs your company's working contextual model.
                  </p>
                </div>

                {/* 2. Prospect Domain */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 focus-within:border-emerald-500 dark:focus-within:border-emerald-500/60 transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      2. Give it a prospect domain to investigate
                    </label>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">REQUIRED</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={prospectUrl}
                      onChange={(e) => setProspectUrl(e.target.value)}
                      placeholder="https://prospect-domain.com"
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                    Discovers pages, extracts evidence, and maps reality.
                  </p>
                </div>
              </div>

              {/* Hero CTA Button */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={!prospectUrl.trim() || isAnalyzing}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold text-xs tracking-wide transition-all shadow-[0_4px_20px_rgba(5,150,105,0.25)] hover:shadow-[0_4px_25px_rgba(5,150,105,0.4)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Radar className="w-4 h-4 animate-spin-slow group-hover:rotate-180 transition-transform" />
                  <span>[Start an Investigation]</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Separates Observed vs. Inferred vs. Unknown</span>
                </div>
              </div>
            </form>
          </div>

          {/* Right Hero Column: Full Tactical Radar Station */}
          <div className="lg:col-span-6">
            <RadarStation />
          </div>
        </div>
      </section>

      {/* ── SECTION 1: YOUR COMPANY CONTEXT ───────────────────────────── */}
      <section className="relative z-10 py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-6 transition-colors">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
              // SECTION 01 // ONTOLOGICAL GROUNDING
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              Your company is more than its website.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Before Common Ground can find an opportunity, it needs to understand you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              <p>
                Provide the context that a website cannot fully express:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-800 dark:text-slate-200">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> What your company does
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> What you build
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> Who you work with
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> Your capabilities
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> Your experience
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> Your constraints
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 col-span-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> What kinds of problems you can solve
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 col-span-2 shadow-xs">
                  <span className="text-emerald-500 font-bold">•</span> What kinds of relationships you are looking for
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/30 shadow-md dark:shadow-xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-semibold">
                  <Database className="w-4 h-4" />
                  <span>WORKING_CONTEXTUAL_MODEL</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  This becomes your company's contextual model. Not a generic profile. A working representation of what you bring to the relationship.
                </p>
                <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                  ELEVATION: BASELINE // PERSISTENT STATE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: PROSPECT INVESTIGATION & WORKFLOW ───────────── */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="space-y-4 max-w-3xl mb-12">
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
            // SECTION 02 // EPISTEMOLOGICAL INVESTIGATION
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
            Then investigate the other side.
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Give Common Ground a prospect website. It does not simply summarize the homepage. It investigates the organization's digital presence as evidence.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            It discovers relevant pages, examines their structure and content, identifies products, services, audiences, proof, commercial signals, and other meaningful evidence. Then it asks: What do we actually know about this company? What are we inferring? What remains unknown? The investigation adapts to what it finds.
          </p>
        </div>

        {/* 5-Card Survey Track */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selectedWorkflowStep === idx;
            return (
              <div
                key={step.num}
                onClick={() => setSelectedWorkflowStep(idx)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                    <span className="font-semibold">STEP_{step.num}</span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5 font-heading">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[9px] font-mono text-emerald-600 dark:text-emerald-400/90 font-semibold">
                  {step.tag}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: TWO MODELS. ONE COMPARISON ─────────────────── */}
      <section className="relative z-10 py-24 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-6 transition-colors">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-3 max-w-3xl">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
              // SECTION 03 // OVERLAP ANALYSIS
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              Two models. One comparison.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Now Common Ground has something most prospecting tools do not. It has a model of you. And a model of them. The question becomes: Where do these two realities overlap?
            </p>
          </div>

          {/* Dimension Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dimensions.map((dim, i) => (
              <div
                key={dim.title}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group relative overflow-hidden shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                    <span>DIM_{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{dim.meta}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-heading mb-2">
                    {dim.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {dim.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>{dim.code}</span>
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: REASON OVER RATING (NOT LEAD SCORING) ───────── */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
              // SECTION 04 // EXPLANATORY LOGIC
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              This is not lead scoring.
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
              A score can tell you that two companies look similar. It cannot necessarily tell you why they should talk. Common Ground attempts to construct that explanation.
            </p>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 text-slate-800 dark:text-slate-200 text-sm font-medium shadow-xs">
              "The goal is not to produce a number. The goal is to produce a reason."
            </div>
          </div>

          {/* Evidence Logic Block */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 shadow-md dark:shadow-2xl font-mono text-xs text-slate-800 dark:text-slate-300 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  EVIDENCE_INFERENCE_ENGINE
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">STATUS: GROUNDED</span>
              </div>

              <div className="space-y-2 py-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1.</span> Your company has demonstrated capability in <span className="text-emerald-600 dark:text-emerald-400 font-bold">[X]</span>.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">2.</span> The prospect is publicly demonstrating a need or initiative around <span className="text-amber-600 dark:text-amber-400 font-bold">[Y]</span>.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">3.</span> The evidence connects <span className="text-emerald-600 dark:text-emerald-400 font-bold">[X]</span> and <span className="text-amber-600 dark:text-amber-400 font-bold">[Y]</span> through <span className="text-indigo-600 dark:text-indigo-400 font-bold">[Z]</span>.
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                <div className="text-emerald-700 dark:text-emerald-400 font-bold text-xs tracking-wider">
                  THEREFORE: Plausible area of common ground worth investigating.
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  CONFIDENCE: DERIVED FROM TRIAD VALIDATION
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: EVIDENTIARY CLASSIFICATION ───────────────────── */}
      <section className="relative z-10 py-24 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-6 transition-colors">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-3 max-w-3xl">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
              // SECTION 05 // EVIDENCE CLASSIFICATION
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              Common ground has to be earned by evidence.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              A plausible match is not automatically a credible opportunity.
            </p>
          </div>

          {/* 3-Column Classification System */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Observed */}
            <div
              onClick={() => setActiveEvidenceTab('observed')}
              className={`p-6 rounded-2xl cursor-pointer transition-all space-y-4 border ${
                activeEvidenceTab === 'observed'
                  ? 'bg-white dark:bg-slate-950 border-emerald-500 shadow-lg ring-2 ring-emerald-500/20 scale-[1.01]'
                  : 'bg-white/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold">
                  1. OBSERVED
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                Directly supported by evidence.
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Found on concrete, public pages with verified text, pricing structures, customer proof, or technical capabilities.
              </p>
              <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400/80 pt-2 border-t border-slate-100 dark:border-slate-800">
                STATUS: DIRECT_PROOF_ESTABLISHED
              </div>
            </div>

            {/* 2. Inferred */}
            <div
              onClick={() => setActiveEvidenceTab('inferred')}
              className={`p-6 rounded-2xl cursor-pointer transition-all space-y-4 border ${
                activeEvidenceTab === 'inferred'
                  ? 'bg-white dark:bg-slate-950 border-amber-500 shadow-lg ring-2 ring-amber-500/20 scale-[1.01]'
                  : 'bg-white/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold">
                  2. INFERRED
                </span>
                <Activity className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                A reasoned conclusion derived from multiple signals.
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                A logical deduction based on adjacent evidence, architectural patterns, or contextual market dynamics.
              </p>
              <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400/80 pt-2 border-t border-slate-100 dark:border-slate-800">
                STATUS: PROBABILISTIC_DEDUCTION
              </div>
            </div>

            {/* 3. Unknown */}
            <div
              onClick={() => setActiveEvidenceTab('unknown')}
              className={`p-6 rounded-2xl cursor-pointer transition-all space-y-4 border ${
                activeEvidenceTab === 'unknown'
                  ? 'bg-white dark:bg-slate-950 border-slate-400 dark:border-slate-400 shadow-lg ring-2 ring-slate-400/20 scale-[1.01]'
                  : 'bg-white/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 text-xs font-mono font-bold">
                  3. UNKNOWN
                </span>
                <HelpCircle className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                Something the available evidence cannot establish.
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Recognized honestly as unobserved data — preventing false assumptions or fabricated outreach pitches.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                STATUS: HONEST_ABSENCE_OF_PROOF
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl shadow-xs">
            That distinction carries through the entire comparison. A company saying it wants something is evidence. A website structure suggesting something else is evidence. A combination of independent signals pointing toward an opportunity is stronger evidence. And when the evidence does not support a match: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Common Ground can say there is no credible opportunity.</span>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: ONTOLOGY TO EPISTEMOLOGY ─────────────────────── */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="space-y-3 mb-12">
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
            // SECTION 06 // EPISTEMIC ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
            From ontology to epistemology.
          </h2>
        </div>

        {/* Split Metaphor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Panel: Ontology */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-500/30 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
              <Building2 className="w-4 h-4" />
              <span>ONTOLOGY (YOUR MODEL)</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              Your company provides the ontology: <br />
              <strong className="text-slate-900 dark:text-white">What are we? What can we do? What do we know about ourselves? What relationships are relevant to us?</strong>
            </p>
          </div>

          {/* Center Convergence Node */}
          <div className="lg:col-span-2 text-center flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-500/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md mb-2">
              <Crosshair className="w-6 h-6 animate-spin-slow" />
            </div>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-bold">
              CONVERGENCE NODE
            </span>
          </div>

          {/* Right Panel: Epistemology */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-purple-200 dark:border-purple-500/30 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold">
              <Globe2 className="w-4 h-4" />
              <span>EPISTEMOLOGY (PROSPECT MODEL)</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              The prospect investigation provides the epistemology: <br />
              <strong className="text-slate-900 dark:text-white">What can we establish about them? What evidence supports it? What remains uncertain?</strong>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center max-w-2xl mx-auto p-4 rounded-xl bg-emerald-50 dark:bg-slate-900/60 border border-emerald-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-emerald-800 dark:text-emerald-300">
          Common Ground brings those two together. Your model of yourself + The evidence-based model of them = The ground you may share.
        </div>
      </section>

      {/* ── SECTION 7: WHAT EMERGES BETWEEN THEM ────────────────────── */}
      <section className="relative z-10 py-24 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-6 transition-colors">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-3 max-w-3xl">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
              // SECTION 07 // SYNTHESIS MATRIX
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              The value is in what emerges between them.
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base">
              The output is not another company summary. You already have a website. They already have a website.
            </p>
          </div>

          {/* Outcome Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outcomes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`p-6 rounded-2xl border ${item.color} flex flex-col justify-between transition-all hover:scale-[1.01] shadow-xs`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-3">
                      <span className="font-bold tracking-wider">{item.tag}</span>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-heading">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: PARADIGM SHIFT & FOOTER CTA ──────────────────── */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="space-y-8 max-w-4xl mx-auto text-center">
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-semibold">
            // SECTION 08 // PARADIGM SHIFT
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
            Research the relationship before you pursue it.
          </h2>

          {/* Paradigm Comparison Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 opacity-70">
              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold block mb-1">TRADITIONAL PARADIGM</span>
              <p className="text-sm font-mono text-slate-500 line-through">
                Find companies → scrape websites → generate leads
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/50 shadow-sm">
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold block mb-1">COMMON GROUND PARADIGM</span>
              <p className="text-sm font-mono text-emerald-900 dark:text-emerald-200">
                Understand yourself → investigate them → compare realities → establish common ground → decide whether to act.
              </p>
            </div>
          </div>

          {/* Core Question Highlight */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-around gap-4 text-sm font-mono shadow-xs">
            <div className="text-slate-500">
              SHIFTS FROM: <span className="line-through">"Who should I contact?"</span>
            </div>
            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
              TO: "Why should these two companies talk?"
            </div>
          </div>
        </div>

        {/* Final Instrument Trigger Box */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-heading">
              Understand them. Understand yourself. Find what connects you.
            </h3>
            <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
              EXECUTE DUAL-MODEL POSITIONING INVESTIGATION
            </p>
          </div>

          <form onSubmit={handleStartInvestigation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Give Common Ground your context
                </label>
                <textarea
                  rows={3}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="What you build, capabilities, constraints, target relationships..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono resize-none"
                />
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <label className="text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Give it a company to investigate
                  </label>
                  <input
                    type="url"
                    required
                    value={prospectUrl}
                    onChange={(e) => setProspectUrl(e.target.value)}
                    placeholder="https://prospect-domain.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!prospectUrl.trim() || isAnalyzing}
                  className="mt-4 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold text-xs tracking-wide transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radar className="w-4 h-4 animate-spin-slow" />
                  <span>[Find Common Ground]</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 px-6 text-center text-xs font-mono text-slate-500 dark:text-slate-600 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>COMMON GROUND // CARTOGRAPHIC POSITIONING ENGINE</span>
          <span>LAT 42°21'30" N // LON 71°03'35" W // EPSG:4326</span>
        </div>
      </footer>
    </div>
  );
}
