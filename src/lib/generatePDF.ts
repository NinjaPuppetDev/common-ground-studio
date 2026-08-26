import jsPDF from 'jspdf';
import type { AnalysisReport } from '../types';

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
  _containerEl: HTMLElement | null = null,
): Promise<Blob | null> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  let y = MARGIN;

  // ── Cover page ──────────────────────────────────────
  addCoverPage(pdf, report);

  // ── Layer 1: What The Company Says ──────────────────
  pdf.addPage();
  pdf.setFillColor(9, 9, 9);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  y = MARGIN;

  addSectionHeader(pdf, y, 'LAYER 1', 'What The Company Says');
  y += 14;
  y = addBodyText(pdf, y, 'Explicit Communication derived directly from primary page copy.');
  y += 4;

  const lens = report.founderLens;
  const layer1 = lens?.layer1WhatTheySay || {
    whatItOffers: report.intendedPosition?.description || report.title || "Not stated",
    whoItServes: "Target audience specified in primary copy.",
    problemsAddressed: "Core customer pain points addressed on landing page.",
    offeringsAndProducts: "Primary products and service packages offered.",
    claimsAndDifferentiators: "Explicit marketing claims and differentiators.",
    keyTerminology: "Key industry and proprietary terminology used.",
    explicitCopySummary: report.title || "Primary page copy summary.",
  };

  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, '1. WHAT IT OFFERS', layer1.whatItOffers);
  y += 3;
  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, '2. WHO IT SERVES', layer1.whoItServes);
  y += 3;
  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, '3. PROBLEMS ADDRESSED', layer1.problemsAddressed);
  y += 3;
  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, '4. OFFERINGS & PRODUCTS', layer1.offeringsAndProducts);
  y += 3;
  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, '5. CLAIMS & DIFFERENTIATORS', layer1.claimsAndDifferentiators);
  y += 3;
  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, '6. KEY TERMINOLOGY', layer1.keyTerminology);
  y += 3;
  y = checkPageBreak(pdf, y, 22);
  y = drawSimpleCard(pdf, y, 'EXPLICIT COPY SUMMARY', layer1.explicitCopySummary);

  // ── Layer 2: What The Website Reveals ───────────────
  const layer2 = report.layer2Analysis;
  if (layer2) {
    y += 8;
    y = checkPageBreak(pdf, y, 16);
    addSectionHeader(pdf, y, 'LAYER 2', 'What The Website Reveals');
    y += 14;
    y = addBodyText(pdf, y, '"What does the website architecture reveal through relationships between pages?"');
    y += 4;

    if (layer2.sourceCoverage) {
      const cov = layer2.sourceCoverage;
      const covText = `Discovered Pages: ${cov.discoveredPagesCount}  |  Analyzed Pages: ${cov.analyzedPagesCount}  |  Unexamined Pages: ${cov.unexaminedPagesCount}\n${cov.coverageNote}`;
      y = checkPageBreak(pdf, y, 20);
      y = drawSimpleCard(pdf, y, 'SOURCE COVERAGE & AUDIT BREADTH', covText);
      y += 3;
    }

    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '1. NAVIGATION & INFORMATION ARCHITECTURE', layer2.navigationAndIa);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '2. PAGE RELATIONSHIPS', layer2.pageRelationships);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '3. PRODUCT / SERVICE STRUCTURE', layer2.productServiceStructure || (layer2 as any).productsAndServices || '');
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '4. COMMERCIAL STRUCTURE', layer2.commercialStructure);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '5. PROOF & TRUST', layer2.proofAndTrust);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '6. CONVERSION PATHS', layer2.conversionPaths);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '7. EXPECTED VISITOR SEQUENCE', layer2.expectedVisitorSequence || (layer2 as any).visitorJourney || '');
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '8. STRUCTURAL PRIORITIES', layer2.structuralPriorities);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '9. CONTRADICTIONS', layer2.contradictions);
    y += 3;
    y = checkPageBreak(pdf, y, 22);
    y = drawSimpleCard(pdf, y, '10. NON-OBVIOUS RELATIONSHIPS', layer2.nonObviousRelationships);

    // Cross-Page Architectural Evidence
    const evidenceList = layer2.crossPageEvidence || (layer2 as any).supportingEvidence || [];
    if (evidenceList.length > 0) {
      y += 6;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 220);
      pdf.text('CROSS-PAGE ARCHITECTURAL EVIDENCE', MARGIN, y);
      y += 6;

      for (const ev of evidenceList.slice(0, 8)) {
        y = checkPageBreak(pdf, y, 20);
        const status = ev.status || 'OBSERVED';
        const sources = Array.isArray(ev.sourcePages) ? ev.sourcePages.join(' → ') : (ev.sourcePages || (ev as any).source || '');
        const title = `[${status}] ${sources}`;
        const text = `${ev.relationshipObserved || (ev as any).relationship || ''}${ev.interpretation ? `\nInterpretation: ${ev.interpretation}` : ''}`;
        y = drawSimpleCard(pdf, y, title, text);
        y += 2;
      }
    }

    // What Remains Unknown
    if (layer2.whatRemainsUnknown) {
      y += 4;
      y = checkPageBreak(pdf, y, 22);
      y = drawSimpleCard(pdf, y, 'WHAT REMAINS UNKNOWN', layer2.whatRemainsUnknown);
    }

    // Architectural Synthesis
    if (layer2.architecturalSynthesis) {
      y += 6;
      y = checkPageBreak(pdf, y, 25);
      y = drawSimpleCard(pdf, y, 'ARCHITECTURAL SYNTHESIS (REVEALED BEYOND COPY)', layer2.architecturalSynthesis);
    }
  }

  // ── Stage 3: Common Ground Synthesis ─────────────────
  const cg = report.commonGroundSynthesis || layer2?.commonGroundSynthesis;
  if (cg) {
    y += 8;
    y = checkPageBreak(pdf, y, 20);
    addSectionHeader(pdf, y, 'STAGE 3', 'Common Ground Comparative Analysis');
    y += 14;

    // 1. Common Ground Finding
    if (cg.commonGroundFinding || cg.systemThesis) {
      y = checkPageBreak(pdf, y, 22);
      const findingStr = typeof cg.commonGroundFinding === 'string'
        ? cg.commonGroundFinding
        : (cg.commonGroundFinding?.thesis || cg.systemThesis || '');
      y = drawSimpleCard(pdf, y, '1. COMMON GROUND CORE FINDING', findingStr);
      y += 3;
    }

    // 2. Where They Agree
    if (cg.whereTheyAgree && cg.whereTheyAgree.length > 0) {
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('2. WHERE THEY AGREE', MARGIN, y);
      y += 6;

      for (const item of cg.whereTheyAgree) {
        y = checkPageBreak(pdf, y, 22);
        if (typeof item === 'string') {
          y = drawSimpleCard(pdf, y, 'ALIGNMENT POINT', item);
        } else {
          const itemObj = item as Record<string, any>;
          const impl = itemObj.businessProductImplication || itemObj.whatThisTellsUs || itemObj.businessImplication || '';
          const claim = itemObj.explicitClaim || '';
          const ev = itemObj.architecturalEvidence || '';
          const text = `Explicit Claim: ${claim}\nArchitectural Evidence: ${ev}${impl ? `\nBusiness Implication: ${impl}` : ''}`;
          y = drawSimpleCard(pdf, y, 'ALIGNMENT POINT', text);
        }
        y += 2;
      }
    }

    // 3. Where They Differ
    if (cg.whereTheyDiffer && cg.whereTheyDiffer.length > 0) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('3. WHERE THEY DIFFER', MARGIN, y);
      y += 6;

      for (const item of cg.whereTheyDiffer) {
        y = checkPageBreak(pdf, y, 22);
        if (typeof item === 'string') {
          y = drawSimpleCard(pdf, y, 'DISCREPANCY POINT', item);
        } else {
          const itemObj = item as Record<string, any>;
          const discType = itemObj.discrepancyType || 'Tension';
          const desc = itemObj.description || itemObj.tension || '';
          const ev = itemObj.evidence || '';
          const text = `Type: ${discType}\nDescription: ${desc}\nEvidence: ${ev}`;
          y = drawSimpleCard(pdf, y, 'DISCREPANCY POINT', text);
        }
        y += 2;
      }
    }

    // 4. What The System Reveals
    if (cg.whatSystemReveals && cg.whatSystemReveals.length > 0) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('4. WHAT THE SYSTEM REVEALS (UNSTATED IN COPY)', MARGIN, y);
      y += 6;

      for (const item of cg.whatSystemReveals) {
        y = checkPageBreak(pdf, y, 22);
        if (typeof item === 'string') {
          y = drawSimpleCard(pdf, y, 'SYSTEM REVELATION', item);
        } else {
          const itemObj = item as Record<string, any>;
          const ins = itemObj.insight || '';
          const ev = itemObj.evidence || '';
          const text = `Insight: ${ins}\nEvidence: ${ev}`;
          y = drawSimpleCard(pdf, y, 'SYSTEM REVELATION', text);
        }
        y += 2;
      }
    }

    // 5. The Business As A System
    if (cg.businessAsSystem) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('5. THE BUSINESS / PRODUCT AS A SYSTEM (OBSERVED VS INFERRED)', MARGIN, y);
      y += 6;

      const biz = cg.businessAsSystem as Record<string, any>;
      const dims = [
        { label: 'Core Product / Service Mechanism', item: biz?.coreMechanism || biz?.coreBusinessMechanism },
        { label: 'Primary User / Customer', item: biz?.primaryUser || biz?.commercialFocusAudience },
        { label: 'Value Creation Mechanism', item: biz?.valueCreation || biz?.capabilityToValueModel },
        { label: 'Commercial Model', item: biz?.commercialModel },
        { label: 'Acquisition Mechanism', item: biz?.acquisitionMechanism },
        { label: 'Conversion Mechanism', item: biz?.conversionMechanism || biz?.primaryIntendedAction },
        { label: 'Retention / Expansion Mechanism', item: biz?.retentionOrExpansion },
        { label: 'Product & System Relationships', item: biz?.productSystemRelationships || biz?.leveragePoints },
      ];

      for (const dim of dims) {
        if (dim.item) {
          y = checkPageBreak(pdf, y, 22);
          const text = `OBSERVED: ${dim.item.observed}\nINFERRED: ${dim.item.inference}`;
          y = drawSimpleCard(pdf, y, dim.label.toUpperCase(), text);
          y += 2;
        }
      }
    }

    // 6. Leverage Points
    if (cg.leveragePoints && cg.leveragePoints.length > 0) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('6. SYSTEM LEVERAGE POINTS', MARGIN, y);
      y += 6;

      for (const item of cg.leveragePoints) {
        y = checkPageBreak(pdf, y, 25);
        const oppTitle = item.problem || (item as any).opportunity || 'Leverage Point';
        const text = `Problem / Opportunity: ${oppTitle}\nIntervention: ${item.potentialIntervention}\nEvidence: ${item.evidence}\nWhy It Matters: ${item.whyItMatters}\nConfidence: ${item.confidence}`;
        y = drawSimpleCard(pdf, y, 'LEVERAGE POINT', text);
        y += 2;
      }
    }

    // 7. Where I Could Help
    if (cg.whereICouldHelp && cg.whereICouldHelp.length > 0) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('7. WHERE I COULD HELP (PROJECT OPPORTUNITIES)', MARGIN, y);
      y += 6;

      for (const item of cg.whereICouldHelp) {
        y = checkPageBreak(pdf, y, 25);
        const itemObj = item as Record<string, any>;
        const title = itemObj.projectTitle || itemObj.opportunity || 'Project Opportunity';
        const scope = itemObj.proposedScope || itemObj.howICouldHelp || '';
        const impact = itemObj.expectedImpact || itemObj.whyItMatters || '';
        const text = `Title: ${title}\nProposed Scope: ${scope}\nExpected Impact: ${impact}`;
        y = drawSimpleCard(pdf, y, 'CLIENT PROJECT OPPORTUNITY', text);
        y += 2;
      }
    }

    // 8. Client Opportunity Bridge / Outbound Angle
    if (cg.outboundAngle) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 220);
      pdf.text('8. CLIENT OPPORTUNITY BRIDGE & FOUNDER OBSERVATION', MARGIN, y);
      y += 6;

      const oa = cg.outboundAngle;
      const whyInt = oa.whyInteresting || oa.whyItMatters || '';
      const conv = oa.potentialConversation || oa.potentialIntervention || '';
      const text = `What I Noticed: ${oa.whatINoticed}\nWhy It Is Interesting: ${whyInt}\nPotential Conversation: ${conv}`;
      y = drawSimpleCard(pdf, y, 'CLIENT OPPORTUNITY BRIDGE', text);
      y += 2;
    }

    // 9. Common Ground Signal
    if (cg.commonGroundSignal) {
      y += 4;
      y = checkPageBreak(pdf, y, 16);
      y = drawSimpleCard(pdf, y, '9. DISTINCTIVE SYSTEM-LEVEL SIGNAL', cg.commonGroundSignal);
      y += 2;
    }

    // 11. Evidence Boundary
    if (cg.evidenceBoundary) {
      y += 4;
      y = checkPageBreak(pdf, y, 25);
      const eb = cg.evidenceBoundary;
      const scopeNote = eb.scopeNote || (eb as any).analyzedScopeNote || '';
      const facts = eb.observedFacts || (eb as any).whatWeKnow || [];
      const infs = eb.inferences || (eb as any).whatWeInfer || [];
      const unks = eb.unknowns || (eb as any).whatRemainsUnknown || [];
      const text = `Scope Note: ${scopeNote}\n\nWHAT WE KNOW (Observed Facts):\n- ${facts.join('\n- ')}\n\nWHAT WE INFER (Inferences):\n- ${infs.join('\n- ')}\n\nWHAT REMAINS UNKNOWN (Gaps):\n- ${unks.join('\n- ')}`;
      y = drawSimpleCard(pdf, y, '11. EVIDENCE BOUNDARY & SCOPE DISCIPLINE', text);
    }

    // 12. Provider Matching & Prospect Qualification (Side B)
    if (cg.providerMatch) {
      y += 4;
      y = checkPageBreak(pdf, y, 25);
      const pm = cg.providerMatch;
      const dims = pm.sevenDimensionFit;
      let dimText = '';
      if (dims) {
        dimText = `\n\n7-DIMENSION EVALUATION:\n` +
          `- Problem Fit: ${dims.problemFit?.score || 'N/A'} — ${dims.problemFit?.note || ''}\n` +
          `- Capability Fit: ${dims.capabilityFit?.score || 'N/A'} — ${dims.capabilityFit?.note || ''}\n` +
          `- Delivery Fit: ${dims.deliveryFit?.score || 'N/A'} — ${dims.deliveryFit?.note || ''}\n` +
          `- Timing Fit: ${dims.timingFit?.score || 'N/A'} — ${dims.timingFit?.note || ''}\n` +
          `- Proof Fit: ${dims.proofFit?.score || 'N/A'} — ${dims.proofFit?.note || ''}\n` +
          `- Commercial Fit: ${dims.commercialFit?.score || 'N/A'} — ${dims.commercialFit?.note || ''}\n` +
          `- Evidence Strength: ${dims.evidenceStrength?.score || 'N/A'} — ${dims.evidenceStrength?.note || ''}`;
      }

      const matchText = `Fit Classification: ${pm.fit} FIT\nQualification Decision: ${pm.decision}\nProblem Category: ${pm.problemCategoryLabel || pm.problemCategory}\nConfidence: ${pm.confidence}%\n\nOPPORTUNITY FORMULA:\n"${pm.opportunity || 'N/A'}"\n\nCompany Need: ${pm.companyNeed}\nEvidence: ${pm.evidence}\nProvider Fit: ${pm.providerFit}\nDelivery Fit: ${pm.deliveryFit}\nTiming Signal: ${pm.timingOrTrigger}\nStudio Proof: ${pm.relevantProof}${dimText}${pm.outreachAngle ? `\n\nFounder Conversation Starter:\n"${pm.outreachAngle}"` : ''}${pm.upgradeRequirements ? `\n\nUpgrade Requirements:\n${pm.upgradeRequirements}` : ''}${pm.disqualificationReason ? `\n\nDisqualification Reason:\n${pm.disqualificationReason}` : ''}`;
      
      y = drawSimpleCard(pdf, y, '12. PROVIDER MATCHING & PROSPECT QUALIFICATION', matchText);
    }
  }

  // ── Sources ─────────────────────────────────────────
  const sources = report.sourceCitations || [];
  if (sources.length > 0) {
    y += 8;
    y = checkPageBreak(pdf, y, 16);
    addSectionHeader(pdf, y, '', 'Sources');
    y += 14;

    for (const src of sources) {
      y = checkPageBreak(pdf, y, 18);
      y = drawSourceEntry(pdf, y, src.title || src.url, src.url, src.snippet || '');
      y += 3;
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