import type { AtsKind } from "../ats/types";

export interface AtsDetection {
  ats: AtsKind;
  slug: string | null;
  careersUrl: string | null;
}

const CAREERS_PATHS = [
  "/careers",
  "/jobs",
  "/join",
  "/join-us",
  "/company/careers",
  "/en/careers",
  "/en/jobs",
  "/career",
  "/careers/",
  "/jobs/",
  "/about/careers",
  "/about-us/careers",
  "/work-with-us",
  "/opportunities",
];

export function detectAtsFromUrl(rawUrl: string): AtsDetection | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  // Greenhouse
  let m = host.match(/^(?:boards|job-boards)\.greenhouse\.io$/i);
  if (m || host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    const slug = path.split("/").filter(Boolean)[0] ?? null;
    if (slug) return { ats: "greenhouse", slug, careersUrl: rawUrl };
  }
  if (host === "grnh.se" || host.endsWith(".grnh.se")) {
    const slug = path.split("/").filter(Boolean)[0] ?? null;
    if (slug) return { ats: "greenhouse", slug, careersUrl: rawUrl };
  }
  // embedded greenhouse path on company site sometimes redirects; also job-boards subdomain patterns
  m = path.match(/boards\.greenhouse\.io\/([^/?#]+)/i);
  if (m) return { ats: "greenhouse", slug: m[1], careersUrl: rawUrl };

  // Lever
  if (host === "jobs.lever.co") {
    const slug = path.split("/").filter(Boolean)[0] ?? null;
    if (slug) return { ats: "lever", slug, careersUrl: rawUrl };
  }

  // Ashby
  if (host === "jobs.ashbyhq.com") {
    const slug = path.split("/").filter(Boolean)[0] ?? null;
    if (slug) return { ats: "ashby", slug, careersUrl: rawUrl };
  }

  // Workable
  if (host === "apply.workable.com") {
    const slug = path.split("/").filter(Boolean)[0] ?? null;
    if (slug && slug !== "api") return { ats: "workable", slug, careersUrl: rawUrl };
  }
  m = host.match(/^([a-z0-9-]+)\.workable\.com$/i);
  if (m && m[1] !== "apply" && m[1] !== "www") {
    return { ats: "workable", slug: m[1], careersUrl: rawUrl };
  }

  // Personio
  m = host.match(/^([a-z0-9-]+)\.jobs\.personio\.([a-z.]+)$/i);
  if (m) {
    return { ats: "personio", slug: m[1], careersUrl: rawUrl };
  }

  return null;
}

export function detectAtsFromHtml(html: string, baseUrl: string): AtsDetection | null {
  const patterns: { re: RegExp; ats: AtsKind; slugGroup: number }[] = [
    {
      re: /https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/([a-zA-Z0-9_-]+)/gi,
      ats: "greenhouse",
      slugGroup: 1,
    },
    { re: /https?:\/\/grnh\.se\/([a-zA-Z0-9_-]+)/gi, ats: "greenhouse", slugGroup: 1 },
    { re: /https?:\/\/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/gi, ats: "lever", slugGroup: 1 },
    { re: /https?:\/\/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/gi, ats: "ashby", slugGroup: 1 },
    {
      re: /https?:\/\/apply\.workable\.com\/([a-zA-Z0-9_-]+)/gi,
      ats: "workable",
      slugGroup: 1,
    },
    {
      re: /https?:\/\/([a-zA-Z0-9-]+)\.workable\.com/gi,
      ats: "workable",
      slugGroup: 1,
    },
    {
      re: /https?:\/\/([a-zA-Z0-9-]+)\.jobs\.personio\.[a-z.]+/gi,
      ats: "personio",
      slugGroup: 1,
    },
  ];

  for (const { re, ats, slugGroup } of patterns) {
    const match = re.exec(html);
    if (match) {
      const slug = match[slugGroup];
      if (!slug || slug === "www" || slug === "apply" || slug === "api") continue;
      return { ats, slug, careersUrl: match[0] };
    }
  }

  // Relative careers links — return as other with URL only
  const linkRe =
    /href=["']([^"']*(?:careers|jobs|join-us|join|work-with-us|opportunities)[^"']*)["']/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRe.exec(html))) {
    const href = linkMatch[1];
    if (href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      const abs = new URL(href, baseUrl).toString();
      const detected = detectAtsFromUrl(abs);
      if (detected) return detected;
    } catch {
      /* ignore bad urls */
    }
  }

  return null;
}

export function extractCareersLinks(html: string, baseUrl: string): string[] {
  const results: string[] = [];
  const linkRe =
    /href=["']([^"']*)["']/gi;
  const interesting =
    /careers|jobs|join-us|\/join(?:\/|$)|lever|greenhouse|ashby|workable|personio/i;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    if (!interesting.test(href)) continue;
    if (href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      results.push(new URL(href, baseUrl).toString());
    } catch {
      /* ignore */
    }
  }
  return [...new Set(results)];
}

export { CAREERS_PATHS };
