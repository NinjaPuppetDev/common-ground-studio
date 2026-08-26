import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Globe, Loader2 } from 'lucide-react';
import AnimatedNetwork from './AnimatedNetwork';
import ThemeToggle from './ThemeToggle';

interface LandingScreenProps {
  onAnalyze: (input: { url: string }) => void;
  isAnalyzing: boolean;
}

/* ── Investigation Preview Panel ──────────────────────── */

function InvestigationPreview() {
  const [steps, setSteps] = useState<{ text: string; done: boolean }[]>([
    { text: 'Homepage analyzed', done: false },
    { text: 'Pricing analyzed', done: false },
    { text: 'Documentation discovered', done: false },
    { text: 'Current hypothesis', done: false },
  ]);
  const [confidence, setConfidence] = useState(48);
  const [hypothesis, setHypothesis] = useState('');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setSteps((prev) => prev.map((s, i) => i === 0 ? { ...s, done: true } : s));
    }, 800));

    timers.push(setTimeout(() => {
      setSteps((prev) => prev.map((s, i) => i === 1 ? { ...s, done: true } : s));
    }, 2200));

    timers.push(setTimeout(() => {
      setSteps((prev) => prev.map((s, i) => i === 2 ? { ...s, done: true } : s));
    }, 3800));

    timers.push(setTimeout(() => {
      setSteps((prev) => prev.map((s, i) => i === 3 ? { ...s, done: true } : s));
      setHypothesis('Professional network for creative professionals');
    }, 5200));

    // Confidence climbs slowly
    const confInterval = setInterval(() => {
      setConfidence((prev) => {
        if (prev >= 72) {
          clearInterval(confInterval);
          return 72;
        }
        return prev + 1;
      });
    }, 120);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(confInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-sm">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-[0.15em]">
          Live Investigation
        </span>
      </div>

      {/* Panel body */}
      <div className="glass-panel border border-border/50 rounded-2xl p-5 shadow-card">
        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4, ease: 'easeOut' }}
              className="flex items-center gap-3"
            >
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
                step.done
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : step.text === 'Current hypothesis'
                    ? 'border-amber-500/30 text-amber-400/50'
                    : 'border-border/50 text-foreground/20'
              }`}>
                {step.done ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              <span className={`text-xs font-medium transition-all duration-500 ${
                step.done
                  ? 'text-foreground/80'
                  : step.text === 'Current hypothesis'
                    ? 'text-amber-400/50'
                    : 'text-foreground/30'
              }`}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Hypothesis block */}
        <AnimatePresence>
          {hypothesis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mt-4 pt-4 border-t border-border/50 overflow-hidden"
            >
              <p className="text-[10px] font-mono text-foreground/30 uppercase tracking-[0.1em] mb-2">
                Current hypothesis
              </p>
              <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                &ldquo;{hypothesis}&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confidence bar */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-foreground/30 uppercase tracking-[0.1em]">
              Confidence
            </span>
            <motion.span
              key={confidence}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-xs font-semibold text-primary"
            >
              {confidence}%
            </motion.span>
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-mono text-foreground/20">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Scroll Indicator ────────────────────────────────── */

function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 1 }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <span className="text-[9px] font-mono text-foreground/20 uppercase tracking-[0.2em]">
        Scroll
      </span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-foreground/20">
          <path d="M1 1l5 5 5-5" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Landing Screen ─────────────────────────────── */

export default function LandingScreen({ onAnalyze, isAnalyzing }: LandingScreenProps) {
  const [url, setUrl] = useState('');
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [netVisible, setNetVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
  const panelY = useTransform(scrollY, [0, 300], [0, 20]);
  const panelOpacity = useTransform(scrollY, [0, 300], [1, 0.6]);

  // Track mouse for parallax
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMouseX(e.clientX);
    setMouseY(e.clientY);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    setNetVisible(true);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAnalyze({ url: url.trim() });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  return (
    <div ref={heroRef} className="relative min-h-screen bg-background overflow-hidden">
      {/* Animated network background */}
      <AnimatedNetwork mouseX={mouseX} mouseY={mouseY} isVisible={netVisible} />

      {/* Subtle dot grid overlay */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary">
              <circle cx="6" cy="6" r="4" />
              <path d="M6 2v8M2 6h8" />
            </svg>
          </div>
          <span className="text-xs font-mono text-foreground/40 uppercase tracking-[0.15em]">
            Common Ground
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-foreground/40 hidden sm:block font-mono">
            AI Strategy Platform
          </span>
          <ThemeToggle showLabel />
        </div>
      </motion.div>

      {/* Hero content */}
      <motion.div
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 pt-24 pb-20"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-xl mx-auto lg:mx-0 lg:mr-12"
        >
          {/* Label */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 text-[10px] font-mono text-primary/70 uppercase tracking-[0.2em] bg-primary/5 border border-primary/10 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Evidence-based strategy
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08]"
          >
            Discover the market position{' '}
            <span className="text-primary">your company has actually earned</span>.
          </motion.h1>

          {/* Supporting copy */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-base sm:text-lg text-foreground/50 leading-relaxed max-w-lg"
          >
            Common Ground investigates your website like an independent strategist. It gathers evidence, challenges its own conclusions, and reveals the position your company has earned — not simply the one it claims.
          </motion.p>

          {/* URL Input + CTA */}
          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="mt-10"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                  inputFocused ? 'text-primary' : 'text-foreground/30'
                }`} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="https://yourcompany.com"
                  disabled={isAnalyzing}
                  className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3.5 text-foreground text-sm
                    placeholder:text-foreground/35 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                    transition-all disabled:opacity-40 shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!url.trim() || isAnalyzing}
                className="flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold rounded-xl px-6 py-3.5
                  hover:bg-primary-hover active:scale-[0.97] transition-all text-sm shadow-glow
                  disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Investigating…
                  </>
                ) : (
                  <>
                    Investigate
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.form>

          {/* Trust text */}
          <motion.p
            variants={itemVariants}
            className="mt-4 text-xs text-foreground/25 tracking-wide"
          >
            No signup required &bull; First investigations are free
          </motion.p>
        </motion.div>

        {/* Right side — Investigation Preview Panel */}
        <motion.div
          style={{ y: panelY, opacity: panelOpacity }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-sm mt-12 lg:mt-0 lg:ml-8 shrink-0"
        >
          <InvestigationPreview />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <ScrollIndicator />

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}