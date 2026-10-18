import type { Ats } from "./types";

export type AtsHit = {
  ats: Exclude<Ats, "other" | "none_found">;
  slug: string;
  url: string;
};

const REJECT_SLUGS = new Set([
  "embed",
  "job_board",
  "job-board",
  "jobs",
  "job",
  "j",
  "v0",
  "v1",
  "api",
  "css",
  "js",
  "assets",
  "static",
  "www",
  "app",
  "career",
  "careers",
  "widget",
  "accounts",
]);

const DETECTORS: Array<{ ats: AtsHit["ats"]; pattern: RegExp; slugIndex?: number }> = [
  {
    ats: "greenhouse",
    pattern:
      /https?:\/\/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?[^"'\\\s<>]*?\bfor=|(?!embed\/)(?!job_board\b))([^/?#"'\\\s<>&]+)/gi,
  },
  {
    ats: "lever",
    pattern: /https?:\/\/jobs(?:\.eu)?\.lever\.co\/([^/?#"'\\\s<>]+)/gi,
  },
  {
    ats: "ashby",
    pattern: /https?:\/\/jobs\.ashbyhq\.com\/([^/?#"'\\\s<>]+)/gi,
  },
  {
    ats: "workable",
    pattern: /https?:\/\/apply\.workable\.com\/(?!api\/)([^/?#"'\\\s<>]+)/gi,
  },
  {
    ats: "personio",
    pattern: /https?:\/\/([a-z0-9][a-z0-9-]*)\.jobs\.personio\.(?:de|com)/gi,
  },
  {
    ats: "teamtailor",
    pattern: /https?:\/\/([a-z0-9][a-z0-9-]*)\.teamtailor\.com/gi,
  },
  {
    ats: "recruitee",
    pattern: /https?:\/\/([a-z0-9][a-z0-9-]*)\.recruitee\.com/gi,
  },
  {
    ats: "smartrecruiters",
    pattern: /https?:\/\/(?:jobs|careers)\.smartrecruiters\.com\/([^/?#"'\\\s<>]+)/gi,
  },
];

function cleanSlug(value: string): string | null {
  let slug = decodeURIComponent(value).trim().replace(/\/+$/, "");
  slug = slug.split("&")[0]?.split("#")[0] ?? slug;
  if (!slug || REJECT_SLUGS.has(slug.toLowerCase())) return null;
  if (!/^[a-z0-9][a-z0-9._+-]*$/i.test(slug)) return null;
  return slug;
}

export function detectAts(html: string): AtsHit | null {
  const source = html.replace(/\\\//g, "/").replace(/&amp;/g, "&");
  for (const detector of DETECTORS) {
    detector.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = detector.pattern.exec(source))) {
      const slug = cleanSlug(match[1] ?? "");
      if (!slug) continue;
      return { ats: detector.ats, slug, url: match[0] };
    }
  }
  return null;
}

const CAREER_HINT =
  /career|careers|jobs|job-|\/jobs|join-us|joinus|work-with-us|vacancies|karriere|stellen|offres|werken-bij|lavora-con|empleo/i;

export function isCareerHref(href: string, text: string): boolean {
  return CAREER_HINT.test(`${href} ${text}`);
}

export type PageLink = { href: string; text: string };

export function extractLinks(html: string, baseUrl: string): PageLink[] {
  const links: PageLink[] = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const attrs = match[1] ?? "";
    const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const raw = hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || "";
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) {
      continue;
    }
    try {
      const href = new URL(raw, baseUrl).toString();
      const text = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      links.push({ href, text });
    } catch {
      continue;
    }
  }
  return links;
}

export function linkedInJobsUrl(links: PageLink[]): string | null {
  for (const link of links) {
    const match = /https?:\/\/(?:[\w-]+\.)?linkedin\.com\/company\/([^/?#]+)/i.exec(link.href);
    if (!match?.[1]) continue;
    const slug = match[1].replace(/\/+$/, "");
    if (!slug || slug === "jobs") continue;
    return `https://www.linkedin.com/company/${slug}/jobs`;
  }
  return null;
}

const PREFERRED_PATHS = ["/careers", "/jobs", "/join-us", "/about/careers"];

export function careerCandidates(links: PageLink[], site: URL): string[] {
  const scored = new Map<string, number>();
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.href);
    } catch {
      continue;
    }
    if (!isCareerHref(url.pathname + url.search, link.text)) continue;
    if (detectAts(link.href)) continue;
    const sameHost = url.hostname.replace(/^www\./, "") === site.hostname.replace(/^www\./, "");
    let score = 10;
    if (sameHost) score += 20;
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (PREFERRED_PATHS.includes(path)) score += 50;
    else if (/\/(careers|jobs|join-us|karriere)(\/|$)/i.test(path)) score += 30;
    const current = scored.get(url.toString()) ?? 0;
    if (score > current) scored.set(url.toString(), score);
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([href]) => href);
}

export function probeUrls(website: string): string[] {
  const origin = new URL(website).origin;
  return PREFERRED_PATHS.map((path) => `${origin}${path}`);
}

export function looksLikeCareersPage(finalUrl: string, html: string, startUrl: string): boolean {
  if (detectAts(html)) return true;
  let finalPath = "";
  let startPath = "";
  try {
    finalPath = new URL(finalUrl).pathname.replace(/\/$/, "") || "/";
    startPath = new URL(startUrl).pathname.replace(/\/$/, "") || "/";
  } catch {
    return false;
  }
  if (finalPath === "/" && startPath !== "/") return false;
  return isCareerHref(finalPath, "") || /<title>[^<]*(career|jobs|join|karriere)/i.test(html);
}
