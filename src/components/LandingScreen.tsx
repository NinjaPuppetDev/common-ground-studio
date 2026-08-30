import React, { useState, type FormEvent } from 'react';
import {
  Compass,
  Search,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  XCircle,
  Crosshair,
  CheckCircle2,
  Sparkles,
  Building2,
  Activity,
  Globe2,
  GitBranch,
} from 'lucide-react';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * COMMON GROUND — Landing page, restyled
 *
 * Direction: cartographic survey / field atlas, not tech-HUD.
 * Warm parchment paper, ink-navy + terracotta as the two "territories,"
 * a serif display face for the editorial voice, thin hairline structure
 * instead of rounded SaaS cards.
 *
 * HERO ART:
 * Real photographic/illustration artwork, served from
 * /hero/a-sophisticated-contemporary-topographic-map-artwo.png (public
 * folder). Opacity, blend mode, and the fade into the paper background are
 * controlled in CSS, not baked into the image.
 *
 * The map "frame" elements (coordinate ruler, compass rose, scale bar) are
 * cheap to hand-code and don't need photographic fidelity, so those stay
 * as SVG/CSS below.
 * ─────────────────────────────────────────────────────────────────────────
 */

const HERO_IMAGE = '/hero/a-sophisticated-contemporary-topographic-map-artwo.png';

const INK = '#1C2B3A';
const PAPER = '#F6F2E9';
const PAPER_DEEP = '#EFE9DB';
const TERRACOTTA = '#B5602E';
const SLATE_BLUE = '#3D5A73';
const WARM_GRAY = '#8A8272';
const CONVERGENCE = '#6E6B45';

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  .font-display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: 'ss01' 1; }
  .font-body { font-family: 'Inter', -apple-system, sans-serif; }
  .font-mark { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
`;

// ── Map-frame chrome: coordinate ruler along the hero's top edge ────────
function MapRuler() {
  const marks = ['120°W', '110°W', '100°W', '90°W', '80°W', '70°W'];
  return (
    <div className="hidden md:flex items-stretch h-8 font-mark text-[10px]" style={{ color: WARM_GRAY }}>
      {marks.map((m) => (
        <div key={m} className="flex-1 border-l flex items-start pl-2 pt-1.5" style={{ borderColor: '#DCD3BE' }}>
          {m}
        </div>
      ))}
    </div>
  );
}

// ── Map-frame chrome: compass rose ───────────────────────────────────────
function CompassRose() {
  return (
    <div className="hidden md:flex flex-col items-center gap-1">
      <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="17" r="15.5" fill="none" stroke={INK} strokeWidth="0.75" opacity="0.6" />
        <path d="M17 4 L20 17 L17 30 L14 17 Z" fill={INK} opacity="0.85" />
        <line x1="4" y1="17" x2="30" y2="17" stroke={INK} strokeWidth="0.5" opacity="0.4" />
      </svg>
      <span className="font-mark text-[9px] tracking-wide" style={{ color: WARM_GRAY }}>N</span>
    </div>
  );
}

// ── Map-frame chrome: scale bar ──────────────────────────────────────────
function ScaleBar() {
  const steps = [0, 2.5, 5, 10, 20];
  return (
    <div className="font-mark text-[10px]" style={{ color: WARM_GRAY }}>
      <div className="mb-1">SCALE 1:250,000</div>
      <div className="flex items-end">
        {steps.slice(0, -1).map((s, i) => (
          <div
            key={s}
            className="h-2 border-t border-l border-r flex items-end justify-start"
            style={{ borderColor: WARM_GRAY, width: 34 }}
          >
            <span className="-translate-x-1/2 translate-y-3">{s}</span>
          </div>
        ))}
        <span className="ml-2 translate-y-0">{steps[steps.length - 1]}km</span>
      </div>
    </div>
  );
}

export default function LandingScreen({ onAnalyze, isAnalyzing }: { onAnalyze: (data: { url: string; userCapabilities?: string }) => void; isAnalyzing: boolean }) {
  const [context, setContext] = useState('');
  const [prospectUrl, setProspectUrl] = useState('');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('observed');
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);

  const handleStartInvestigation = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!prospectUrl.trim() || isAnalyzing) return;
    onAnalyze({ url: prospectUrl.trim(), userCapabilities: context.trim() || undefined });
  };

  const workflowSteps = [
    { num: '01', title: 'Discover', desc: "Map the organization's available digital presence across public architectural pathways.", icon: Search },
    { num: '02', title: 'Investigate', desc: 'Examine the evidence relevant to understanding product, market positioning, and commercial reality.', icon: Compass },
    { num: '03', title: 'Identify gaps', desc: 'Determine which claims remain unsupported, ambiguous, or unevidenced.', icon: HelpCircle },
    { num: '04', title: 'Go deeper, selectively', desc: 'Follow targeted evidence paths required to answer the critical operational questions.', icon: GitBranch },
    { num: '05', title: 'Establish reality', desc: 'Separate what is observed from what is inferred and what remains unknown.', icon: ShieldCheck },
  ];

  const dimensions = [
    { title: 'Capabilities', desc: 'What each organization can actually do, supported by concrete proof and mechanisms.' },
    { title: 'Problems', desc: 'What each organization appears to need or be positioned around.' },
    { title: 'Markets', desc: 'Who they serve and where their commercial activities intersect.' },
    { title: 'Technology', desc: 'Relevant technical capabilities, architecture, and areas of engineering expertise.' },
    { title: 'Products & services', desc: 'What each organization offers and where those offerings complement one another.' },
    { title: 'Evidence', desc: 'What can actually be established about the potential fit from grounded artifacts.' },
    { title: 'Commercial context', desc: 'Whether there are meaningful signals that a relationship could make commercial sense.' },
  ];

  const outcomes = [
    { title: 'Shared problems', desc: 'Where your capabilities correspond to an observable, evidenced need in their operation.', icon: CheckCircle2, tone: SLATE_BLUE },
    { title: 'Complementary capabilities', desc: "Where one organization's capabilities naturally extend the other without conflicting.", icon: Sparkles, tone: SLATE_BLUE },
    { title: 'Strategic overlap', desc: 'Where markets, technologies, products, or strategic initiatives intersect constructively.', icon: GitBranch, tone: CONVERGENCE },
    { title: 'Evidence-backed opportunities', desc: 'Where enough concrete evidence exists to justify proactive outreach and executive time.', icon: ShieldCheck, tone: CONVERGENCE },
    { title: 'Uncertainty', desc: 'Where the relationship looks interesting but essential questions remain unverified.', icon: HelpCircle, tone: TERRACOTTA },
    { title: 'No credible opportunity', desc: 'Where the evidence does not justify pursuing the relationship — saving time and reputation.', icon: XCircle, tone: '#8f4a4a' },
  ];

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: PAPER, color: INK }}>
      <style>{fontImport}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: INK }}>
              <Crosshair className="w-4 h-4" style={{ color: INK }} strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-display text-[16px] tracking-tight leading-none" style={{ color: INK }}>
                Common Ground
              </div>
              <div className="font-mark text-[9px] tracking-[0.14em] mt-1" style={{ color: WARM_GRAY }}>
                CARTOGRAPHIC NAVIGATION
              </div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[14px]" style={{ color: INK }}>
            <a href="#how" className="hover:opacity-60 transition-opacity">How it works</a>
            <a href="#dimensions" className="hover:opacity-60 transition-opacity">Dimensions</a>
            <a href="#outcomes" className="hover:opacity-60 transition-opacity">Outcomes</a>
            <a href="#" className="hover:opacity-60 transition-opacity">Log in</a>
          </nav>
          <button
            className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: INK }}
          >
            Start exploration
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-b" style={{ borderColor: '#DCD3BE' }}>
        {/* Artwork, full-bleed, fading into the paper on the left where text sits */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '68% 45%', opacity: 0.8, mixBlendMode: 'multiply' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${PAPER} 0%, ${PAPER} 22%, rgba(246,242,233,0.55) 42%, rgba(246,242,233,0) 62%)` }}
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(0deg, ${PAPER} 0%, rgba(246,242,233,0) 18%, rgba(246,242,233,0) 82%, ${PAPER} 100%)` }}
          />
        </div>

        {/* Coordinate ruler, top edge */}
        <div className="relative px-6 max-w-6xl mx-auto">
          <MapRuler />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-24">
          <div className="flex items-start justify-between mb-8">
            <p className="font-mark text-[11px] tracking-[0.16em]" style={{ color: WARM_GRAY }}>
              CARTOGRAPHIC NAVIGATION FOR RELATIONSHIPS
            </p>
            <CompassRose />
          </div>

          <div className="max-w-lg space-y-7">
            <h1 className="font-display text-[44px] sm:text-[54px] leading-[1.05] tracking-tight" style={{ color: INK }}>
              Find the ground between your company and the ones you want to reach.
            </h1>
            <p className="text-[17px] leading-relaxed" style={{ color: '#4A4A42' }}>
              Common Ground investigates a prospect, builds an evidence-based model of what they actually do, and charts where that reality overlaps with yours.
            </p>

            <form onSubmit={handleStartInvestigation} className="space-y-3 pt-2">
              <div className="p-4 rounded-sm border" style={{ borderColor: '#DCD3BE', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <label className="flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: INK }}>
                  <Building2 className="w-3.5 h-3.5" style={{ color: SLATE_BLUE }} />
                  Your company, in a sentence or two
                  <span className="ml-auto font-mark text-[10px]" style={{ color: WARM_GRAY }}>optional</span>
                </label>
                <textarea
                  rows={2}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="What you build, who you serve, what you're looking for..."
                  className="w-full bg-transparent text-[13px] placeholder:opacity-50 focus:outline-none resize-none"
                  style={{ color: INK }}
                />
              </div>

              <div className="p-4 rounded-sm border" style={{ borderColor: '#DCD3BE', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <label className="flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: INK }}>
                  <Globe2 className="w-3.5 h-3.5" style={{ color: TERRACOTTA }} />
                  A company to investigate
                </label>
                <input
                  type="url"
                  required
                  value={prospectUrl}
                  onChange={(e) => setProspectUrl(e.target.value)}
                  placeholder="prospect-domain.com"
                  className="w-full bg-transparent text-[14px] placeholder:opacity-50 focus:outline-none"
                  style={{ color: INK }}
                />
              </div>

              <button
                type="submit"
                disabled={!prospectUrl.trim() || isAnalyzing}
                className="w-full sm:w-auto px-6 py-3 text-[13px] font-medium tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-white"
                style={{ backgroundColor: INK }}
              >
                <span>Start an investigation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="absolute bottom-8 left-6 z-10">
            <ScaleBar />
          </div>
        </div>
      </section>

      {/* ── SECTION 1: YOUR COMPANY CONTEXT ────────────────────────── */}
      <section className="relative border-t" style={{ borderColor: '#DCD3BE', backgroundColor: PAPER_DEEP }}>
        <div className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-6 space-y-4">
            <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 01</p>
            <h2 className="font-display text-[32px] leading-tight" style={{ color: INK }}>
              Your company is more than its website.
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: '#4A4A42' }}>
              Before Common Ground can find an opportunity, it needs to understand you — the parts a homepage can't fully express: what you build, who you serve, your constraints, and the kinds of relationships you're actually looking for.
            </p>
          </div>
          <div className="md:col-span-6 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]" style={{ color: INK }}>
            {['What your company does', 'What you build', 'Who you work with', 'Your capabilities', 'Your experience', 'Your constraints', 'Problems you can solve', 'Relationships you want'].map((item) => (
              <div key={item} className="flex items-baseline gap-2 py-2 border-b" style={{ borderColor: '#DCD3BE' }}>
                <span style={{ color: TERRACOTTA }}>—</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WORKFLOW ────────────────────────────────────── */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-2xl mb-14 space-y-4">
          <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 02 — HOW IT WORKS</p>
          <h2 className="font-display text-[34px] leading-tight" style={{ color: INK }}>
            Then it investigates the other side.
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: '#4A4A42' }}>
            Give Common Ground a prospect's website. It doesn't summarize the homepage — it discovers pages, examines structure and content, and identifies products, audiences, proof, and commercial signals as evidence. The investigation adapts to what it finds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 border-t border-b" style={{ borderColor: '#DCD3BE' }}>
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selectedWorkflowStep === idx;
            return (
              <button
                key={step.num}
                onClick={() => setSelectedWorkflowStep(idx)}
                className="text-left p-5 border-r last:border-r-0 transition-colors"
                style={{
                  borderColor: '#DCD3BE',
                  backgroundColor: isSelected ? 'white' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mark text-[11px]" style={{ color: WARM_GRAY }}>{step.num}</span>
                  <Icon className="w-4 h-4" style={{ color: isSelected ? TERRACOTTA : WARM_GRAY }} strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-[17px] mb-1.5" style={{ color: INK }}>{step.title}</h3>
                <p className="text-[12.5px] leading-relaxed" style={{ color: '#5A5A50' }}>{step.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: DIMENSIONS ──────────────────────────────────── */}
      <section id="dimensions" className="relative border-t" style={{ borderColor: '#DCD3BE', backgroundColor: PAPER_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12 space-y-4">
            <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 03</p>
            <h2 className="font-display text-[34px] leading-tight" style={{ color: INK }}>
              Two models. One comparison.
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: '#4A4A42' }}>
              Common Ground now has a model of you, and a model of them. The question becomes: where do these two realities overlap?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
            {dimensions.map((dim) => (
              <div key={dim.title} className="space-y-1.5">
                <h3 className="font-display text-[18px]" style={{ color: INK }}>{dim.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#5A5A50' }}>{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: NOT LEAD SCORING ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 04</p>
          <h2 className="font-display text-[34px] leading-tight" style={{ color: INK }}>
            This is not lead scoring.
          </h2>
          <p className="text-[16px] leading-relaxed" style={{ color: '#4A4A42' }}>
            A score can tell you that two companies look similar. It can't tell you why they should talk. Common Ground constructs that explanation.
          </p>
          <p className="font-display italic text-[19px] pl-4 border-l-2" style={{ borderColor: TERRACOTTA, color: INK }}>
            The goal is not to produce a number. The goal is to produce a reason.
          </p>
        </div>

        <div className="lg:col-span-6 border p-7 space-y-4" style={{ borderColor: '#DCD3BE', backgroundColor: 'white' }}>
          <div className="flex items-center justify-between text-[11px] font-mark pb-3 border-b" style={{ borderColor: '#DCD3BE', color: WARM_GRAY }}>
            <span>EVIDENCE → INFERENCE</span>
          </div>
          <div className="space-y-3 text-[14px]" style={{ color: INK }}>
            <p><span style={{ color: SLATE_BLUE }} className="font-medium">1.</span> Your company has demonstrated capability in <em className="font-display not-italic font-medium" style={{ color: SLATE_BLUE }}>X</em>.</p>
            <p><span style={{ color: TERRACOTTA }} className="font-medium">2.</span> The prospect is publicly demonstrating a need around <em className="font-display not-italic font-medium" style={{ color: TERRACOTTA }}>Y</em>.</p>
            <p><span style={{ color: CONVERGENCE }} className="font-medium">3.</span> The evidence connects X and Y through <em className="font-display not-italic font-medium" style={{ color: CONVERGENCE }}>Z</em>.</p>
          </div>
          <div className="pt-3 border-t" style={{ borderColor: '#DCD3BE' }}>
            <p className="font-display text-[15px]" style={{ color: INK }}>Therefore: a plausible area of common ground worth investigating.</p>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: EVIDENCE CLASSIFICATION ─────────────────────── */}
      <section className="relative border-t" style={{ borderColor: '#DCD3BE', backgroundColor: PAPER_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12 space-y-4">
            <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 05</p>
            <h2 className="font-display text-[34px] leading-tight" style={{ color: INK }}>
              Common ground has to be earned by evidence.
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: '#4A4A42' }}>
              A plausible match is not automatically a credible opportunity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l" style={{ borderColor: '#DCD3BE' }}>
            {[
              { key: 'observed', label: 'Observed', tone: SLATE_BLUE, icon: ShieldCheck, title: 'Directly supported by evidence.', desc: 'Found on concrete, public pages with verified text, pricing, customer proof, or technical capabilities.' },
              { key: 'inferred', label: 'Inferred', tone: TERRACOTTA, icon: Activity, title: 'A reasoned conclusion from multiple signals.', desc: 'A logical deduction based on adjacent evidence, architectural patterns, or market dynamics.' },
              { key: 'unknown', label: 'Unknown', tone: WARM_GRAY, icon: HelpCircle, title: 'What the evidence cannot establish.', desc: 'Recognized honestly as unobserved — preventing false assumptions or fabricated outreach.' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeEvidenceTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveEvidenceTab(tab.key)}
                  className="text-left p-7 border-r border-b transition-colors"
                  style={{ borderColor: '#DCD3BE', backgroundColor: isActive ? 'white' : 'transparent' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mark text-[11px] tracking-wide" style={{ color: tab.tone }}>{tab.label.toUpperCase()}</span>
                    <Icon className="w-4 h-4" style={{ color: tab.tone }} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-[19px] mb-2" style={{ color: INK }}>{tab.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#5A5A50' }}>{tab.desc}</p>
                </button>
              );
            })}
          </div>

          <p className="text-[14px] leading-relaxed max-w-3xl mt-8" style={{ color: '#4A4A42' }}>
            A company saying it wants something is evidence. A website structure suggesting something else is evidence. Independent signals pointing the same direction are stronger evidence. And when the evidence doesn't support a match, <span style={{ color: SLATE_BLUE }} className="font-medium">Common Ground can say there is no credible opportunity.</span>
          </p>
        </div>
      </section>

      {/* ── SECTION 6: ONTOLOGY → EPISTEMOLOGY ─────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <p className="font-mark text-[11px] tracking-[0.14em] mb-4" style={{ color: SLATE_BLUE }}>SECTION 06</p>
        <h2 className="font-display text-[34px] leading-tight mb-12" style={{ color: INK }}>
          From what you are, to what can be shown.
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 p-7 border" style={{ borderColor: SLATE_BLUE, borderLeftWidth: 3 }}>
            <p className="font-mark text-[11px] mb-3" style={{ color: SLATE_BLUE }}>YOUR MODEL</p>
            <p className="text-[15px] leading-relaxed" style={{ color: INK }}>
              Your company provides the foundation: what you are, what you can do, and what relationships are relevant to you.
            </p>
          </div>
          <div className="lg:col-span-2 flex flex-col items-center justify-center gap-2">
            <Crosshair className="w-6 h-6" style={{ color: CONVERGENCE }} strokeWidth={1.5} />
            <span className="font-mark text-[10px] tracking-wide" style={{ color: CONVERGENCE }}>WHERE THEY MEET</span>
          </div>
          <div className="lg:col-span-5 p-7 border" style={{ borderColor: TERRACOTTA, borderRightWidth: 3 }}>
            <p className="font-mark text-[11px] mb-3" style={{ color: TERRACOTTA }}>THE PROSPECT MODEL</p>
            <p className="text-[15px] leading-relaxed" style={{ color: INK }}>
              The investigation provides the rest: what can be established about them, what evidence supports it, what remains uncertain.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: OUTCOMES ────────────────────────────────────── */}
      <section id="outcomes" className="relative border-t" style={{ borderColor: '#DCD3BE', backgroundColor: PAPER_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12 space-y-4">
            <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 07</p>
            <h2 className="font-display text-[34px] leading-tight" style={{ color: INK }}>
              The value is in what emerges between them.
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: '#4A4A42' }}>
              You already have a website. They already have a website. The output here is not another summary of either one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: '#DCD3BE' }}>
            {outcomes.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-7 space-y-3" style={{ backgroundColor: 'white' }}>
                  <Icon className="w-4 h-4" style={{ color: item.tone }} strokeWidth={1.5} />
                  <h3 className="font-display text-[18px]" style={{ color: INK }}>{item.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#5A5A50' }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: CLOSING CTA ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28 text-center space-y-10">
        <div className="space-y-6">
          <p className="font-mark text-[11px] tracking-[0.14em]" style={{ color: SLATE_BLUE }}>SECTION 08</p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.1]" style={{ color: INK }}>
            Research the relationship before you pursue it.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto pt-4">
            <div className="p-5 border" style={{ borderColor: '#DCD3BE' }}>
              <p className="font-mark text-[10px] mb-1.5" style={{ color: WARM_GRAY }}>OLD APPROACH</p>
              <p className="text-[14px] line-through" style={{ color: WARM_GRAY }}>
                Find companies → scrape websites → generate leads
              </p>
            </div>
            <div className="p-5 border" style={{ borderColor: SLATE_BLUE, backgroundColor: 'white' }}>
              <p className="font-mark text-[10px] mb-1.5" style={{ color: SLATE_BLUE }}>COMMON GROUND APPROACH</p>
              <p className="text-[14px]" style={{ color: INK }}>
                Understand yourself → investigate them → compare realities → decide whether to act.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto border p-8 sm:p-10 space-y-6" style={{ borderColor: '#DCD3BE', backgroundColor: 'white' }}>
          <h3 className="font-display text-[24px]" style={{ color: INK }}>
            Understand them. Understand yourself. Find what connects you.
          </h3>
          <form onSubmit={handleStartInvestigation} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
              type="url"
              required
              value={prospectUrl}
              onChange={(e) => setProspectUrl(e.target.value)}
              placeholder="prospect-domain.com"
              className="px-4 py-3 border text-[14px] focus:outline-none"
              style={{ borderColor: '#DCD3BE', color: INK }}
            />
            <button
              type="submit"
              disabled={!prospectUrl.trim() || isAnalyzing}
              className="px-6 py-3 text-[13px] font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: INK }}
            >
              Find common ground
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t px-6 py-8" style={{ borderColor: '#DCD3BE' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mark text-[11px]" style={{ color: WARM_GRAY }}>
          <span>COMMON GROUND — CARTOGRAPHIC NAVIGATION</span>
          <span>MAPPING WHAT ACTUALLY CONNECTS TWO COMPANIES</span>
        </div>
      </footer>
    </div>
  );
}