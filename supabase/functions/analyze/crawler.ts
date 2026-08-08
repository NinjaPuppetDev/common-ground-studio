import type { PageCat, PageMeta } from "./shared.ts";
import { rawFetch, extractText } from "./shared.ts";

// ── Priority tiers ────────────────────────────────────────────

const PRIORITY_TABLE: Record<PageCat, number> = {
  homepage: 100,
  about: 85,
  products: 80,
  case_studies: 75,
  customers: 55,
  pricing: 45,
  blog: 25,
  documentation: 10,
  careers: 5,
  support: 5,
  legal: 0,
  other: 30,
};

// No categories are ignored: every target category (including Legal) must be
// resolvable via sitemap / navigation links / URL pattern so it can be marked
// Sampled, Not present, or Skipped rather than silently dropped.
const IGNORED_CATS: Set<PageCat> = new Set([]);

// ── URL classification ────────────────────────────────────────
//
// Using RegExp constructor instead of regex literals to avoid
// forward-slash escaping issues with the Deno bundler.

function rx(pattern: string): RegExp {
  return new RegExp(pattern);
}

const CAT_RX: [RegExp, PageCat][] = [
  [rx("^/([?#]|$)"), "homepage"],
  [rx("/about(/|$)"), "about"],
  [rx("/company(/|$)"), "about"],
  [rx("/who-we-are(/|$)"), "about"],
  [rx("/team(/|$)"), "about"],
  [rx("/product(s)?(/|$)"), "products"],
  [rx("/service(s)?(/|$)"), "products"],
  [rx("/platform(/|$)"), "products"],
  [rx("/solutions(/|$)"), "products"],
  [rx("/features(/|$)"), "products"],
  [rx("/offerings(/|$)"), "products"],
  [rx("/case-stud(y|ies)(/|$)"), "case_studies"],
  [rx("/work(/|$)"), "case_studies"],
  [rx("/portfolio(/|$)"), "case_studies"],
  [rx("/examples(/|$)"), "case_studies"],
  [rx("/customer(s)?(/|$)"), "customers"],
  [rx("/client(s)?(/|$)"), "customers"],
  [rx("/testimonials?(/|$)"), "customers"],
  [rx("/pricing(/|$)"), "pricing"],
  [rx("/plans?(/|$)"), "pricing"],
  [rx("/blog(/|$)"), "blog"],
  [rx("/articles(/|$)"), "blog"],
  [rx("/insights(/|$)"), "blog"],
  [rx("/news(/|$)"), "blog"],
  [rx("/docs(/|$)"), "documentation"],
  [rx("/documentation(/|$)"), "documentation"],
  [rx("/developer(s)?(/|$)"), "documentation"],
  [rx("/guides?(/|$)"), "documentation"],
  [rx("/api(/|$)"), "documentation"],
  [rx("/careers(/|$)"), "careers"],
  [rx("/jobs(/|$)"), "careers"],
  [rx("/support(/|$)"), "support"],
  [rx("/help(/|$)"), "support"],
  [rx("/contact(/|$)"), "support"],
  [rx("/faq(/|$)"), "support"],
  [rx("/legal(/|$)"), "legal"],
  [rx("/privacy(/|$)"), "legal"],
  [rx("/terms(/|$)"), "legal"],
  [rx("/cookies(/|$)"), "legal"],
  [rx("/gdpr(/|$)"), "legal"],
];

function classify(path: string): PageCat {
  for (const [rx, c] of CAT_RX) {
    if (rx.test(path)) return c;
  }
  return "other";
}

// ── Priority helpers ──────────────────────────────────────────

export function priorityFor(cat: PageCat): number {
  return PRIORITY_TABLE[cat] ?? 0;
}

export function isIgnored(cat: PageCat): boolean {
  return IGNORED_CATS.has(cat);
}

// ── Site Discovery ────────────────────────────────────────────

export async function discover(url: string): Promise<PageMeta[]> {
  const base = new URL(url).origin;
  const sm = await sitemap(base);
  if (sm.length > 0) return sm;
  return crawl(url, base);
}

async function sitemap(base: string): Promise<PageMeta[]> {
  try {
    const r = await fetch(base + "/sitemap.xml", {
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const pages: PageMeta[] = [];
    const seen = new Set<string>();
    const rx = /<loc[^>]*>([^<]+)<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(xml)) !== null) {
      const href = m[1].trim();
      if (seen.has(href)) continue;
      seen.add(href);
      const cat = classify(new URL(href).pathname);
      if (isIgnored(cat)) continue;
      pages.push({
        url: href,
        title: extractTitleFromUrl(href),
        pageType: cat,
        priority: priorityFor(cat),
      });
    }
    if (!pages.some((p) => p.pageType === "homepage")) {
      pages.unshift({
        url: base,
        title: "Home",
        pageType: "homepage",
        priority: 100,
      });
    }
    return pages.sort((a, b) => b.priority - a.priority).slice(0, 20);
  } catch {
    return [];
  }
}

// ── Link extraction from any page's HTML ──────────────────────
//
// Used both by the initial homepage crawl and while sampling pages,
// so links discovered mid-investigation feed the resolution queue.

export function linksFromHtml(
  html: string,
  base: string,
  known?: Set<string>,
): PageMeta[] {
  const seen = new Set<string>(known ?? []);
  const links: PageMeta[] = [];
  const rx = /<a[^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) !== null) {
    try {
      const raw = new URL(m[1], base).href;
      const resolved = raw.split("#")[0]; // strip hash fragments
      if (!resolved.startsWith(base) || seen.has(resolved)) continue;
      seen.add(resolved);
      const p = new URL(resolved).pathname;
      if (
        /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml|pdf|zip|mp4|webm)$/i
          .test(p)
      ) continue;
      if (/\/wp-|\/cdn-cgi/.test(p)) continue;
      const cat = classify(p);
      links.push({
        url: resolved,
        title: extractTitleFromUrl(resolved),
        pageType: cat,
        priority: priorityFor(cat),
      });
    } catch {
      /* skip */
    }
  }
  return links;
}

async function crawl(baseUrl: string, base: string): Promise<PageMeta[]> {
  const html = await rawFetch(baseUrl);
  if (!html) {
    return [
      {
        url: baseUrl.replace(/\/$/, ""),
        title: "Home",
        pageType: "homepage",
        priority: 100,
      },
    ];
  }

  const home = baseUrl.replace(/\/$/, "");
  const pages: PageMeta[] = [
    {
      url: home,
      title: extractTitleFromHtml(html) || "Home",
      pageType: "homepage",
      priority: 100,
    },
  ];

  for (const link of linksFromHtml(html, base, new Set([home]))) {
    pages.push(link);
  }
  return pages.sort((a, b) => b.priority - a.priority).slice(0, 15);
}

// ── Dedup helper — skip pages similar to already-processed ones ──

const SIMILAR_CAT_CLUSTERS: Record<string, PageCat[]> = {
  products: ["products"],
  case_studies: ["case_studies"],
  customers: ["customers"],
};

export function isRedundant(
  candidate: PageMeta,
  analyzed: PageMeta[],
): boolean {
  const cluster = SIMILAR_CAT_CLUSTERS[candidate.pageType];
  if (!cluster) return false;
  // If we already analyzed a page of this cluster, the candidate is redundant
  return analyzed.some((a) => cluster.includes(a.pageType));
}

// ── URL / HTML title extraction helpers ───────────────────────

function extractTitleFromUrl(href: string): string {
  try {
    const u = new URL(href);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return "Home";
    const last = segs[segs.length - 1]
      .replace(/[-_]/g, " ")
      .replace(/\.[a-z]+$/i, "");
    return last.charAt(0).toUpperCase() + last.slice(1);
  } catch {
    return "Page";
  }
}

function extractTitleFromHtml(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
}