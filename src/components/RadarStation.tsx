import { useState, useEffect, useRef } from 'react';

interface RadarTarget {
  id: string;
  code: string;
  name: string;
  type: 'host' | 'prospect' | 'overlap';
  category: 'observed' | 'inferred' | 'unknown';
  bearing: number; // Angle in degrees (0 - 359)
  distance: number; // Normalized 0 - 1 (from center)
  color: string;
  evidenceStrength: string;
  details: string;
  dimension: string;
}

const RADAR_TARGETS: RadarTarget[] = [
  {
    id: 'tgt-1',
    code: 'TGT-01 // HOST_ONTOLOGY',
    name: 'Your Company Model',
    type: 'host',
    category: 'observed',
    bearing: 225,
    distance: 0.52,
    color: '#3B82F6', // Blue
    evidenceStrength: '100% (First-Party Grounding)',
    details: 'Core engineering capabilities, verified architecture, known target customer segments, and delivery constraints.',
    dimension: 'Internal Ontology',
  },
  {
    id: 'tgt-2',
    code: 'TGT-02 // PROSPECT_DOMAIN',
    name: 'Prospect Evidence Base',
    type: 'prospect',
    category: 'observed',
    bearing: 42,
    distance: 0.68,
    color: '#8B5CF6', // Purple
    evidenceStrength: '84% (Public Evidence Ingested)',
    details: 'Discovered pricing tiers, documented enterprise security requirements, case studies, and engineering blog posts.',
    dimension: 'External Epistemology',
  },
  {
    id: 'tgt-3',
    code: 'TGT-03 // COMMON_GROUND_LOCKED',
    name: 'Strategic Overlap Node',
    type: 'overlap',
    category: 'observed',
    bearing: 105,
    distance: 0.38,
    color: '#10B981', // Emerald
    evidenceStrength: 'Verified (3 Convergent Signals)',
    details: 'Your data pipeline acceleration capability directly solves their documented multi-region latency bottleneck.',
    dimension: 'Common Ground Intersect',
  },
  {
    id: 'tgt-4',
    code: 'TGT-04 // INFERRED_NEED',
    name: 'Compliance Modernization',
    type: 'prospect',
    category: 'inferred',
    bearing: 310,
    distance: 0.78,
    color: '#F59E0B', // Amber
    evidenceStrength: 'Inferred (Adjacent Pattern)',
    details: 'Recent European expansion announcements imply an impending requirement for localized EU data residency.',
    dimension: 'Commercial Context',
  },
  {
    id: 'tgt-5',
    code: 'TGT-05 // UNKNOWN_BUDGET',
    name: 'Internal Decision Cadence',
    type: 'prospect',
    category: 'unknown',
    bearing: 170,
    distance: 0.85,
    color: '#94A3B8', // Slate
    evidenceStrength: 'Unknown (Absence of Proof)',
    details: 'Fiscal year timeline and executive sign-off authority cannot be determined from public digital artifacts.',
    dimension: 'Organizational Episteme',
  },
];

export default function RadarStation() {
  const [azimuth, setAzimuth] = useState<number>(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('tgt-3');
  const [activeBlipFlash, setActiveBlipFlash] = useState<Record<string, number>>({});
  
  const lastAzimuthRef = useRef<number>(0);
  const rpm = 20; // Natural steady sweep
  const rangeKm = 100;

  // Animation Loop for Radar Azimuth Sweep
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const updateSweep = (now: number) => {
      const delta = now - lastTimestamp;
      lastTimestamp = now;

      // Calculate degrees per ms: (rpm * 360) / 60000
      const degPerMs = (rpm * 360) / 60000;
      setAzimuth((prev) => {
        const next = (prev + degPerMs * delta) % 360;

        // Check if sweep crossed any target
        RADAR_TARGETS.forEach((tgt) => {
          const prevAz = lastAzimuthRef.current;
          const currentAz = next;
          
          let crossed = false;
          if (prevAz <= currentAz) {
            crossed = tgt.bearing >= prevAz && tgt.bearing <= currentAz;
          } else {
            // Wrapped around 360
            crossed = tgt.bearing >= prevAz || tgt.bearing <= currentAz;
          }

          if (crossed) {
            setActiveBlipFlash((flashes) => ({
              ...flashes,
              [tgt.id]: Date.now(),
            }));
          }
        });

        lastAzimuthRef.current = next;
        return next;
      });

      animationFrameId = requestAnimationFrame(updateSweep);
    };

    animationFrameId = requestAnimationFrame(updateSweep);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const selectedTarget = RADAR_TARGETS.find((t) => t.id === selectedTargetId) || RADAR_TARGETS[2];

  return (
    <div
      id="radar-station-panel"
      className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl dark:shadow-2xl overflow-hidden transition-colors"
    >
      {/* Topographic Glow Effect */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 relative" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
              RADAR_STATION // POSITION_STREAM
            </h3>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
              PPI TACTICAL SCOPE // EPSG:4326 // CALIBRATION: LOCKED
            </span>
          </div>
        </div>

        {/* Live Azimuth Telemetry */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-emerald-300 font-mono text-xs font-semibold">
            BEARING: {azimuth.toFixed(1).padStart(5, '0')}°
          </div>
          <div className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-medium hidden sm:block">
            LOCK: ACTIVE
          </div>
        </div>
      </div>

      {/* Main Radar Screen Layout: Centered & Focused Scope */}
      <div className="flex flex-col items-center justify-center">
        {/* Radar Circular Scope (Plan Position Indicator) */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 rounded-full bg-slate-950 border-4 border-slate-300 dark:border-slate-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.85),0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden flex items-center justify-center select-none">
          {/* CRT Screen Scanlines & Phosphor Grain */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-20" />
          <div
            className="absolute inset-0 opacity-15 pointer-events-none z-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(52, 211, 153, 0.2) 2px, rgba(52, 211, 153, 0.2) 4px)',
            }}
          />

          {/* Azimuth Degree Markings Ring */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 400 400">
            {/* Outer compass ring */}
            <circle cx="200" cy="200" r="190" fill="none" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="184" fill="none" stroke="rgba(52, 211, 153, 0.15)" strokeWidth="1" strokeDasharray="2 4" />

            {/* Azimuth Tick marks around perimeter */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = i * 10;
              const isMajor = angle % 30 === 0;
              const isCardinal = angle % 90 === 0;
              const rad = (angle * Math.PI) / 180;
              const rOuter = 190;
              const rInner = isCardinal ? 172 : isMajor ? 178 : 184;
              const x1 = 200 + rOuter * Math.sin(rad);
              const y1 = 200 - rOuter * Math.cos(rad);
              const x2 = 200 + rInner * Math.sin(rad);
              const y2 = 200 - rInner * Math.cos(rad);

              return (
                <line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isCardinal ? '#34D399' : isMajor ? 'rgba(52, 211, 153, 0.7)' : 'rgba(52, 211, 153, 0.3)'}
                  strokeWidth={isCardinal ? 2 : isMajor ? 1.2 : 0.8}
                />
              );
            })}

            {/* Cardinal Labels */}
            <text x="200" y="32" fill="#34D399" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">000° N</text>
            <text x="372" y="204" fill="#34D399" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">090° E</text>
            <text x="200" y="380" fill="#34D399" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">180° S</text>
            <text x="28" y="204" fill="#34D399" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">270° W</text>

            {/* Concentric Range Rings */}
            {/* Ring 1: 25% */}
            <circle cx="200" cy="200" r="42" fill="none" stroke="rgba(52, 211, 153, 0.25)" strokeWidth="1" />
            {/* Ring 2: 50% */}
            <circle cx="200" cy="200" r="85" fill="none" stroke="rgba(52, 211, 153, 0.35)" strokeWidth="1" strokeDasharray="3 3" />
            {/* Ring 3: 75% */}
            <circle cx="200" cy="200" r="128" fill="none" stroke="rgba(52, 211, 153, 0.25)" strokeWidth="1" />
            {/* Ring 4: 100% */}
            <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(52, 211, 153, 0.4)" strokeWidth="1.5" />

            {/* Range ring labels */}
            <text x="204" y="160" fill="rgba(52, 211, 153, 0.7)" fontSize="8" fontFamily="monospace">25k</text>
            <text x="204" y="118" fill="rgba(52, 211, 153, 0.7)" fontSize="8" fontFamily="monospace">50k</text>
            <text x="204" y="75" fill="rgba(52, 211, 153, 0.7)" fontSize="8" fontFamily="monospace">75k</text>
            <text x="204" y="38" fill="rgba(52, 211, 153, 0.7)" fontSize="8" fontFamily="monospace">100k</text>

            {/* Crosshair Grids */}
            <line x1="200" y1="30" x2="200" y2="370" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1" />
            <line x1="30" y1="200" x2="370" y2="200" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1" />
            {/* Diagonal Reticle lines */}
            <line x1="80" y1="80" x2="320" y2="320" stroke="rgba(52, 211, 153, 0.15)" strokeWidth="0.75" strokeDasharray="4 4" />
            <line x1="80" y1="320" x2="320" y2="80" stroke="rgba(52, 211, 153, 0.15)" strokeWidth="0.75" strokeDasharray="4 4" />
          </svg>

          {/* Rotating Radar Sweeping Beam with Phosphor Trail Cone */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              transform: `rotate(${azimuth}deg)`,
              transformOrigin: '50% 50%',
            }}
          >
            {/* Conic Phosphor Afterglow Trail (90 degree decay arc) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from -90deg at 50% 50%, rgba(52, 211, 153, 0.38) 0deg, rgba(52, 211, 153, 0.15) 35deg, rgba(52, 211, 153, 0.03) 70deg, transparent 90deg, transparent 360deg)',
              }}
            />
            {/* Leading Razor Sweep Line */}
            <div
              className="absolute top-1/2 left-1/2 w-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-emerald-300 via-emerald-400 to-white"
              style={{
                boxShadow: '0 0 10px #34D399, 0 0 20px #10B981',
              }}
            />
          </div>

          {/* Baseline Acquisition Vectors Connecting Target 1 & 2 to Intersect */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" viewBox="0 0 400 400">
            {(() => {
              const getCoords = (bearing: number, dist: number) => {
                const rad = ((bearing - 90) * Math.PI) / 180;
                const r = dist * 170;
                return { x: 200 + r * Math.cos(rad), y: 200 + r * Math.sin(rad) };
              };
              const hostPt = getCoords(RADAR_TARGETS[0].bearing, RADAR_TARGETS[0].distance);
              const prospectPt = getCoords(RADAR_TARGETS[1].bearing, RADAR_TARGETS[1].distance);
              const overlapPt = getCoords(RADAR_TARGETS[2].bearing, RADAR_TARGETS[2].distance);

              return (
                <>
                  {/* Dashed baseline vector: Host -> Overlap */}
                  <line
                    x1={hostPt.x}
                    y1={hostPt.y}
                    x2={overlapPt.x}
                    y2={overlapPt.y}
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  {/* Dashed baseline vector: Prospect -> Overlap */}
                  <line
                    x1={prospectPt.x}
                    y1={prospectPt.y}
                    x2={overlapPt.x}
                    y2={overlapPt.y}
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                </>
              );
            })()}
          </svg>

          {/* Target Blips */}
          {RADAR_TARGETS.map((target) => {
            // Convert bearing and distance to Cartesian percentage
            const rad = ((target.bearing - 90) * Math.PI) / 180;
            const rPercent = target.distance * 42.5; // Max 42.5% from center to stay inside 85% ring
            const leftPercent = 50 + rPercent * Math.cos(rad);
            const topPercent = 50 + rPercent * Math.sin(rad);

            const isSelected = selectedTargetId === target.id;
            const lastFlash = activeBlipFlash[target.id] || 0;
            const isRecentFlash = Date.now() - lastFlash < 1200;

            return (
              <button
                key={target.id}
                type="button"
                onClick={() => setSelectedTargetId(target.id)}
                title={`${target.name} (${target.code})`}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                }}
              >
                {/* Outer pulse ring on radar sweep contact */}
                {isRecentFlash && (
                  <span
                    className="absolute -inset-3 rounded-full animate-ping pointer-events-none opacity-80"
                    style={{ backgroundColor: target.color }}
                  />
                )}

                {/* Target Blip Core */}
                <div
                  className={`relative w-4 h-4 rounded-full flex items-center justify-center transition-transform ${
                    isSelected ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-black' : 'group-hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: target.color,
                    boxShadow: `0 0 12px ${target.color}, 0 0 24px ${target.color}`,
                  }}
                >
                  {target.type === 'overlap' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </div>

                {/* Tactical Target Callout Tag */}
                <div
                  className={`absolute left-5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap pointer-events-none transition-all ${
                    isSelected
                      ? 'bg-slate-900/90 text-white border border-emerald-400 shadow-md scale-105'
                      : 'bg-black/70 text-slate-300 border border-slate-700/80 group-hover:bg-slate-900 group-hover:text-white'
                  }`}
                >
                  {target.code.split(' // ')[0]}
                </div>
              </button>
            );
          })}

          {/* Center Origin Radar Beacon */}
          <div className="absolute z-25 w-3 h-3 rounded-full bg-emerald-400 border border-white shadow-[0_0_10px_#34D399]" />
        </div>

        {/* Selected Target Footnote Status */}
        <div className="mt-4 w-full max-w-md p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-center justify-between text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selectedTarget.color }}
            />
            <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedTarget.name}:</span>
            <span className="text-[11px] text-slate-500">{selectedTarget.dimension}</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            {selectedTarget.bearing}° / {(selectedTarget.distance * rangeKm).toFixed(0)}km
          </span>
        </div>

        {/* Quick Scope Telemetry Bar */}
        <div className="mt-2 w-full max-w-md flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 px-2">
          <span>COORDINATE: LAT 6.2442° N // LON 75.5812° W</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">SIGNAL: LOCK_ESTABLISHED</span>
        </div>
      </div>
    </div>
  );
}
