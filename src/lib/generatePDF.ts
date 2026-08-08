import jsPDF from 'jspdf';
import type { AnalysisReport, PositioningSignal, MarketSpace, PositioningClarityItem, PositioningRecommendation } from '../types';

const PAGE_W = 210; // A4 width in mm
const PAGE_H = 297; // A4 height in mm
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Generate a professional PDF report from an AnalysisReport.
 * Renders content directly from the data — no DOM capture needed.
 */
export async function generatePDFReport(
  report: AnalysisReport,
  _containerEl: HTMLElement | null,
): Promise<Blob | null> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  let y = MARGIN;

  // ── Cover page ──────────────────────────────────────
  addCoverPage(pdf, report);

  // ── Layer 1: Initial Hypothesis ─────────────────────
  y = MARGIN;
  addSectionHeader(pdf, y, 'Layer 2', 'Initial hypothesis');
  y += 14;
  y = addBodyText(pdf, y, 'Based on the evidence so far…');
  y += 2;

  const posDesc = report.intendedPosition?.description || 'Insufficient data to determine intended position';
  const posRationale = report.intendedPosition?.rationale;
  y = drawWrappedText(pdf, posDesc, y, 13, 'bold', 100, 140, 255);
  if (posRationale) {
    y = drawWrappedText(pdf, posRationale, y, 9, 'italic', 120, 120, 130);
  }

  // ── Layer 2: Supporting Evidence ────────────────────
  y += 6;
  y = checkPageBreak(pdf, y, 8);
  addSectionHeader(pdf, y, 'Layer 3', 'Supporting evidence');
  y += 14;
  y = addBodyText(pdf, y, 'How this hypothesis was constructed. Each observation contributed to the current understanding.');
  y += 2;

  const signals = (report.positioningSignals || []).slice(0, 6);
  for (const signal of signals) {
    y = checkPageBreak(pdf, y, 30);
    const firstEv = signal.evidence?.[0];
    y = drawEvidenceCard(pdf, y, signal, firstEv);
  }
  if (signals.length === 0) {
    y = addBodyText(pdf, y, 'No evidence artifacts to display.');
  }

  // ── Layer 3: Hypothesis Evolution ───────────────────
  y += 6;
  y = checkPageBreak(pdf, y, 8);
  addSectionHeader(pdf, y, 'Layer 4', 'Hypothesis evolution');
  y += 14;
  y = addBodyText(pdf, y, 'How understanding evolved as each page was analyzed.');
  y += 2;

  const versions: { label: string; desc: string; note: string }[] = [];
  if (report.intendedPosition) versions.push({ label: 'Version 1', desc: report.intendedPosition.description, note: 'Based on what the company communicates directly' });
  if (report.inferredPosition) versions.push({ label: 'Version 2 (Adjusted)', desc: report.inferredPosition.description, note: 'After examining evidence across pages' });

  for (const v of versions) {
    y = checkPageBreak(pdf, y, 25);
    y = drawVersionCard(pdf, y, v.label, v.note, v.desc);
  }

  if (report.earnedPosition) {
    y += 4;
    y = checkPageBreak(pdf, y, 20);
    y = drawSimpleCard(pdf, y, 'Final Assessment', report.earnedPosition.explanation);
  }

  // ── Layer 4: Contradictions ─────────────────────────
  const gaps = report.positioningGaps || [];
  const journey = report.visitorJourney || [];
  const weakJourneyStages = journey.filter((j: { effect: string }) => j.effect === 'weakens_position');
  const contradictions = [
    ...gaps,
    ...weakJourneyStages.map((j: { stage: string; explanation: string }) => ({
      area: j.stage, description: j.explanation, impact: 'moderate' as const, gapType: 'messaging_inconsistency' as const,
    })),
  ];

  if (contradictions.length > 0) {
    y += 6;
    y = checkPageBreak(pdf, y, 8);
    addSectionHeader(pdf, y, 'Layer 5', 'Contradictions');
    y += 14;
    y = addBodyText(pdf, y, 'Evidence that weakens or complicates the market position.');
    y += 2;

    for (const c of contradictions) {
      y = checkPageBreak(pdf, y, 25);
      y = drawContradictionCard(pdf, y, c.area, c.description, c.impact);
    }
  }

  // ── Layer 5: Stabilization ──────────────────────────
  y += 6;
  y = checkPageBreak(pdf, y, 8);
  addSectionHeader(pdf, y, 'Layer 6', 'Stabilization');
  y += 14;
  y = addBodyText(pdf, y, 'No additional evidence would meaningfully change the inferred market position.');
  y += 2;

  const meta = report.analysisMetadata;
  const confidence = meta?.finalConfidence ?? 0;
  const pct = Math.round(confidence * 100);
  const analyzed = meta?.pagesAnalyzed ?? 0;
  const discovered = meta?.pagesDiscovered ?? 0;
  const stopReason = meta?.stopReason ?? 'Completed';
  const progression = meta?.confidenceProgression ?? [];

  y = checkPageBreak(pdf, y, 35);
  y = drawStabilitySection(pdf, y, pct, discovered, analyzed, stopReason, progression);

  // ── Layer 6: Final Synthesis ────────────────────────
  y += 6;
  y = checkPageBreak(pdf, y, 8);
  addSectionHeader(pdf, y, 'Layer 7', 'Final synthesis');
  y += 14;
  y = addBodyText(pdf, y, 'The complete market position, consolidated.');
  y += 2;

  if (report.positionSummary) {
    y = checkPageBreak(pdf, y, 20);
    y = drawSimpleCard(pdf, y, 'Summary', `"${report.positionSummary}"`);
  }

  if (report.marketSpace) {
    y += 4;
    y = checkPageBreak(pdf, y, 30);
    y = drawMarketSpace(pdf, y, report.marketSpace);
  }

  if (report.positioningClarity) {
    y += 4;
    y = checkPageBreak(pdf, y, 30);
    y = drawClaritySection(pdf, y, report.positioningClarity.items || []);
  }

  const recs = report.positioningRecommendations || [];
  if (recs.length > 0) {
    y += 4;
    y = checkPageBreak(pdf, y, 30);
    y = drawRecommendations(pdf, y, recs.slice(0, 4));
  }

  // ── Layer 7: Reflection ─────────────────────────────
  if (report.finalQuestion) {
    y += 6;
    y = checkPageBreak(pdf, y, 8);
    addSectionHeader(pdf, y, 'Layer 8', 'Reflection');
    y += 14;
    y = checkPageBreak(pdf, y, 25);
    y = drawReflectionCard(pdf, y, report.finalQuestion);
  }

  // ── Sources ─────────────────────────────────────────
  const sources = report.sourceCitations || [];
  if (sources.length > 0) {
    y += 6;
    y = checkPageBreak(pdf, y, 8);
    addSectionHeader(pdf, y, '', 'Sources');
    y += 14;
    for (const src of sources) {
      y = checkPageBreak(pdf, y, 15);
      y = drawSourceEntry(pdf, y, src.title || src.url, src.url, src.snippet || '');
    }
  }

  // ── Final page ──────────────────────────────────────
  pdf.addPage();
  pdf.setFillColor(9, 9, 9);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  pdf.setTextColor(100, 100, 110);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(
    `Generated by Common Ground · ${new Date(report.analyzedAt).toLocaleDateString()}`,
    PAGE_W / 2,
    PAGE_H / 2,
    { align: 'center' },
  );

  return pdf.output('blob');
}

/* ── Cover Page ──────────────────────────────────────── */

function addCoverPage(pdf: jsPDF, report: AnalysisReport) {
  pdf.setFillColor(9, 9, 9);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  pdf.setTextColor(220, 220, 230);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  const title = report.title || 'Market Position Report';
  pdf.text(title, PAGE_W / 2, 90, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(140, 140, 150);
  if (report.url) {
    pdf.text(report.url, PAGE_W / 2, 104, { align: 'center' });
  }

  const dateStr = new Date(report.analyzedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  pdf.text(`Investigation completed ${dateStr}`, PAGE_W / 2, 116, { align: 'center' });

  pdf.setDrawColor(40, 40, 50);
  pdf.setLineWidth(0.5);
  pdf.line(PAGE_W / 2 - 30, 130, PAGE_W / 2 + 30, 130);

  const meta = report.analysisMetadata;
  if (meta) {
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 130);
    const stats = [
      `Pages analyzed: ${meta.pagesAnalyzed}`,
      `Pages discovered: ${meta.pagesDiscovered}`,
      `Final confidence: ${Math.round(meta.finalConfidence * 100)}%`,
    ];
    let sy = 142;
    for (const s of stats) {
      pdf.text(s, PAGE_W / 2, sy, { align: 'center' });
      sy += 7;
    }
  }
}

/* ── Section helpers ─────────────────────────────────── */

function addSectionHeader(pdf: jsPDF, y: number, layer: string, title: string) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text(layer, MARGIN, y + 3);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(220, 220, 230);
  pdf.text(title, MARGIN, y + 10);
}

function addBodyText(pdf: jsPDF, y: number, text: string): number {
  return drawWrappedText(pdf, text, y, 9, 'normal', 140, 140, 150);
}

function drawWrappedText(
  pdf: jsPDF,
  text: string,
  y: number,
  fontSize: number,
  style: 'normal' | 'bold' | 'italic',
  r: number,
  g: number,
  b: number,
): number {
  pdf.setFont('helvetica', style);
  pdf.setFontSize(fontSize);
  pdf.setTextColor(r, g, b);
  const lines = pdf.splitTextToSize(text, CONTENT_W);
  pdf.text(lines, MARGIN, y);
  const lineHeight = fontSize * 0.3528;
  return y + lines.length * lineHeight + 1;
}

/* ── Card renderers ──────────────────────────────────── */

function drawEvidenceCard(pdf: jsPDF, y: number, signal: PositioningSignal, firstEv: any): number {
  const source = firstEv?.source || 'Unknown source';
  const excerpt = firstEv?.excerpt || signal.signal;
  const reasoning = signal.contributesToPosition || signal.reasoningNote || '';

  // Draw card background
  const labelY = y + 4;
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, 0, 'F'); // placeholder

  // Source & type
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text(`${source}  ·  ${signal.signalType}`, MARGIN + 4, labelY);

  // Excerpt
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 190);
  const excerptLines = pdf.splitTextToSize(`"${excerpt}"`, CONTENT_W - 16);
  const excerptY = labelY + 4;
  pdf.text(excerptLines, MARGIN + 4, excerptY);

  let cardH: number;
  if (reasoning) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 120, 130);
    const reasonLines = pdf.splitTextToSize(`→ ${reasoning}`, CONTENT_W - 16);
    const reasonY = excerptY + excerptLines.length * 3.5 + 2;
    pdf.text(reasonLines, MARGIN + 4, reasonY);
    cardH = reasonY + reasonLines.length * 3 + 4 - y;
  } else {
    cardH = excerptY + excerptLines.length * 3.5 + 4 - y;
  }

  // Redraw background with correct height
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, cardH, 'F');
  // Re-render content
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text(`${source}  ·  ${signal.signalType}`, MARGIN + 4, labelY);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 190);
  pdf.text(excerptLines, MARGIN + 4, excerptY);
  if (reasoning) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(120, 120, 130);
    const reasonLines = pdf.splitTextToSize(`→ ${reasoning}`, CONTENT_W - 16);
    const reasonY = excerptY + excerptLines.length * 3.5 + 2;
    pdf.text(reasonLines, MARGIN + 4, reasonY);
  }

  return y + cardH + 3;
}

function drawVersionCard(pdf: jsPDF, y: number, label: string, note: string, description: string): number {
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, 0, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 140, 255);
  pdf.text(label, MARGIN + 4, y + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text(note, MARGIN + 4, y + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(180, 180, 190);
  const descLines = pdf.splitTextToSize(description, CONTENT_W - 16);
  const descY = y + 14;
  pdf.text(descLines, MARGIN + 4, descY);

  const cardH = descY + descLines.length * 3.5 + 4 - y;
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, cardH, 'F');
  // Re-render
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 140, 255);
  pdf.text(label, MARGIN + 4, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text(note, MARGIN + 4, y + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(180, 180, 190);
  pdf.text(descLines, MARGIN + 4, descY);

  return y + cardH + 3;
}

function drawSimpleCard(pdf: jsPDF, y: number, label: string, content: string): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 90);
  pdf.text(label, MARGIN + 4, y + 4);

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8.5);
  pdf.setTextColor(180, 180, 190);
  const lines = pdf.splitTextToSize(content, CONTENT_W - 16);
  const contentY = y + 10;
  pdf.text(lines, MARGIN + 4, contentY);

  const cardH = contentY + lines.length * 3.5 + 4 - y;
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, cardH, 'F');
  // Re-render
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 90);
  pdf.text(label, MARGIN + 4, y + 4);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8.5);
  pdf.setTextColor(180, 180, 190);
  pdf.text(lines, MARGIN + 4, contentY);

  return y + cardH + 3;
}

function drawContradictionCard(pdf: jsPDF, y: number, area: string, description: string, impact: string): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(220, 220, 230);
  pdf.text(area, MARGIN + 4, y + 4);

  // Impact badge
  let impactR = 120, impactG = 120, impactB = 130;
  if (impact === 'significant') { impactR = 200; impactG = 80; impactB = 60; }
  else if (impact === 'moderate') { impactR = 200; impactG = 180; impactB = 60; }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(impactR, impactG, impactB);
  const impactW = pdf.getTextWidth(impact);
  pdf.text(impact, MARGIN + CONTENT_W - impactW - 4, y + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 190);
  const descLines = pdf.splitTextToSize(description, CONTENT_W - 16);
  const descY = y + 10;
  pdf.text(descLines, MARGIN + 4, descY);

  const cardH = descY + descLines.length * 3.5 + 4 - y;
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, cardH, 'F');
  // Re-render
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(220, 220, 230);
  pdf.text(area, MARGIN + 4, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(impactR, impactG, impactB);
  pdf.text(impact, MARGIN + CONTENT_W - impactW - 4, y + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 190);
  pdf.text(descLines, MARGIN + 4, descY);

  return y + cardH + 3;
}

function drawStabilitySection(
  pdf: jsPDF,
  y: number,
  pct: number,
  discovered: number,
  analyzed: number,
  stopReason: string,
  progression: { pageType: string; confidence: number }[],
): number {
  let currentY = y;

  // Stability card
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, currentY, CONTENT_W, 28, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 130);
  pdf.text('Position stability', MARGIN + 4, currentY + 4);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(220, 220, 230);
  pdf.text(`${pct}%`, MARGIN + CONTENT_W - 10, currentY + 10, { align: 'right' });

  // Stability bar bg
  pdf.setFillColor(30, 30, 40);
  pdf.rect(MARGIN + 4, currentY + 12, CONTENT_W - 8, 3, 'F');
  // Fill
  let fillR = 100, fillG = 140, fillB = 255;
  if (pct >= 80) { fillR = 60; fillG = 200; fillB = 100; }
  else if (pct >= 50) { fillR = 200; fillG = 180; fillB = 60; }
  pdf.setFillColor(fillR, fillG, fillB);
  if (pct > 0) {
    pdf.rect(MARGIN + 4, currentY + 12, ((CONTENT_W - 8) * pct) / 100, 3, 'F');
  }

  const stabilityLabel = pct >= 90 ? 'Stable' : pct >= 75 ? 'Converging' : pct >= 50 ? 'Developing' : 'Emerging';
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text(stabilityLabel, MARGIN + 4, currentY + 20);

  currentY += 32;

  // Stats grid
  const cellW = (CONTENT_W - 8) / 3;
  const stats = [
    { label: 'Discovered', value: discovered },
    { label: 'Analyzed', value: analyzed },
    { label: 'Skipped', value: discovered - analyzed },
  ];
  for (let i = 0; i < 3; i++) {
    const cx = MARGIN + i * (cellW + 4);
    pdf.setFillColor(16, 16, 20);
    pdf.rect(cx, currentY, cellW, 16, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(220, 220, 230);
    pdf.text(String(stats[i].value), cx + cellW / 2, currentY + 7, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(80, 80, 90);
    pdf.text(stats[i].label, cx + cellW / 2, currentY + 13, { align: 'center' });
  }
  currentY += 20;

  // Stop reason card
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, currentY, CONTENT_W, 14, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text('Why investigation stopped', MARGIN + 4, currentY + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(180, 180, 190);
  pdf.text(stopReason, MARGIN + 4, currentY + 10);
  currentY += 18;

  // Confidence progression
  if (progression.length > 1) {
    currentY += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(80, 80, 90);
    pdf.text('Confidence progression', MARGIN, currentY);
    currentY += 6;

    for (const p of progression) {
      currentY = checkPageBreak(pdf, currentY, 8);
      const rowY = currentY;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 130);
      pdf.text(p.pageType.replace(/_/g, ' '), MARGIN, rowY + 3);

      // Bar bg
      pdf.setFillColor(30, 30, 40);
      pdf.rect(MARGIN + 40, rowY, CONTENT_W - 70, 3, 'F');
      // Bar fill
      let barR = 100, barG = 140, barB = 255;
      if (p.confidence >= 80) { barR = 60; barG = 200; barB = 100; }
      else if (p.confidence >= 50) { barR = 200; barG = 180; barB = 60; }
      pdf.setFillColor(barR, barG, barB);
      if (p.confidence > 0) {
        pdf.rect(MARGIN + 40, rowY, ((CONTENT_W - 70) * p.confidence) / 100, 3, 'F');
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(160, 160, 170);
      pdf.text(`${p.confidence}%`, MARGIN + CONTENT_W - 20, rowY + 3);
      currentY += 5;
    }
  }

  return currentY;
}

function drawMarketSpace(pdf: jsPDF, y: number, ms: MarketSpace): number {
  let currentY = y;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 90);
  pdf.text('Market Space', MARGIN, currentY);
  currentY += 6;

  const spaces: { label: string; space: string; rationale: string; r: number; g: number; b: number }[] = [
    { label: 'Primary', space: ms.primary?.space || 'Unknown', rationale: ms.primary?.rationale || '', r: 60, g: 200, b: 100 },
    ...(ms.secondary ? [{ label: 'Secondary', space: ms.secondary.space, rationale: ms.secondary.rationale, r: 200, g: 180, b: 60 }] : []),
    ...(ms.emerging ? [{ label: 'Emerging', space: ms.emerging.space, rationale: ms.emerging.rationale, r: 200, g: 160, b: 60 }] : []),
  ];

  for (const s of spaces) {
    currentY = checkPageBreak(pdf, currentY, 16);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(s.r, s.g, s.b);
    pdf.text(s.label, MARGIN, currentY + 3);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 190);
    pdf.text(s.space, MARGIN + 22, currentY + 3);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 130);
    currentY = drawWrappedText(pdf, s.rationale, currentY + 8, 7, 'italic', 120, 120, 130);
  }

  return currentY;
}

function drawClaritySection(pdf: jsPDF, y: number, items: PositioningClarityItem[]): number {
  let currentY = y;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 90);
  pdf.text('Positioning Clarity', MARGIN, currentY);
  currentY += 6;

  for (const item of items.slice(0, 5)) {
    currentY = checkPageBreak(pdf, currentY, 14);
    const symbol = item.clarity === 'explicit' ? '✓' : item.clarity === 'implicit' ? '→' : item.clarity === 'ambiguous' ? '?' : '×';
    let symR = 200, symG = 80, symB = 60;
    if (item.clarity === 'explicit') { symR = 60; symG = 200; symB = 100; }
    else if (item.clarity === 'implicit') { symR = 200; symG = 180; symB = 60; }
    else if (item.clarity === 'ambiguous') { symR = 200; symG = 160; symB = 60; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(symR, symG, symB);
    pdf.text(symbol, MARGIN, currentY + 3);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 190);
    pdf.text(item.question, MARGIN + 8, currentY + 3);

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 130);
    currentY = drawWrappedText(pdf, item.explanation, currentY + 8, 7, 'italic', 120, 120, 130);
  }

  return currentY;
}

function drawRecommendations(pdf: jsPDF, y: number, recs: PositioningRecommendation[]): number {
  let currentY = y;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 90);
  pdf.text('Recommendations', MARGIN, currentY);
  currentY += 6;

  for (const rec of recs) {
    currentY = checkPageBreak(pdf, currentY, 16);
    const prioLabel = rec.priority === 'high' ? 'H' : rec.priority === 'medium' ? 'M' : 'L';
    let prioR = 200, prioG = 80, prioB = 60;
    if (rec.priority === 'medium') { prioR = 200; prioG = 180; prioB = 60; }
    else if (rec.priority === 'low') { prioR = 120; prioG = 120; prioB = 130; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(prioR, prioG, prioB);
    pdf.text(prioLabel, MARGIN, currentY + 3);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 190);
    pdf.text(rec.action, MARGIN + 8, currentY + 3);

    if (rec.observationChain) {
      currentY = drawWrappedText(pdf, `${rec.observationChain.observation} → ${rec.observationChain.inference}`, currentY + 8, 7, 'italic', 120, 120, 130);
    }

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 110);
    currentY = drawWrappedText(pdf, rec.rationale, currentY + 1, 7, 'italic', 100, 100, 110);
  }

  return currentY;
}

function drawReflectionCard(pdf: jsPDF, y: number, question: string): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text('Final question', MARGIN + 4, y + 4);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(220, 220, 230);
  const lines = pdf.splitTextToSize(`"${question}"`, CONTENT_W - 16);
  pdf.text(lines, MARGIN + 4, y + 10);

  const cardH = 10 + lines.length * 4 + 4;
  pdf.setFillColor(16, 16, 20);
  pdf.rect(MARGIN, y, CONTENT_W, cardH, 'F');
  // Re-render
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(80, 80, 90);
  pdf.text('Final question', MARGIN + 4, y + 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(220, 220, 230);
  pdf.text(lines, MARGIN + 4, y + 10);

  const nextY = y + cardH + 4;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 100, 110);
  return drawWrappedText(pdf, 'That is the unique position this company occupies — the space that would be empty without them.', nextY, 7.5, 'italic', 100, 100, 110);
}

function drawSourceEntry(pdf: jsPDF, y: number, title: string, url: string, snippet: string): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(180, 180, 190);
  pdf.text(title, MARGIN, y + 3);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 90);
  pdf.text(url, MARGIN, y + 8);
  if (snippet) {
    const nextY = drawWrappedText(pdf, snippet, y + 13, 7, 'italic', 120, 120, 130);
    return nextY;
  }
  return y + 12;
}

/* ── Utilities ────────────────────────────────────────── */

function checkPageBreak(pdf: jsPDF, y: number, neededMM: number): number {
  if (y + neededMM > PAGE_H - MARGIN) {
    pdf.addPage();
    pdf.setFillColor(9, 9, 9);
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
    return MARGIN + 10;
  }
  return y;
}

/**
 * Trigger a download of the PDF blob.
 */
export function downloadPDFBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build a safe filename from the report data.
 */
export function buildPDFFilename(report: AnalysisReport): string {
  const domain = report.url
    ? report.url.replace(/https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-zA-Z0-9]/g, '_')
    : 'report';
  const date = new Date(report.analyzedAt).toISOString().split('T')[0];
  return `common-ground_${domain}_${date}.pdf`;
}