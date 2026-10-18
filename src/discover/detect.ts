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

const INVALID_SLUGS = new Set([
  "embed",
  "api",
  "www",
  "apply",
  "job_board",
  "job_app",
  "jobs",
  "js",
]);

function greenhouseSlugFromUrl(url: URL): string | null {
  const forParam = url.searchParams.get("for");
  if (forParam && !INVALID_SLUGS.has(forParam.toLowerCase())) return forParam;
  const parts = url.pathname.split("/").filter(Boolean);
  const first = parts[0] ?? null;
  if (first && !INVALID_SLUGS.has(first.toLowerCase())) return first;
  return null;
}

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
  let m: RegExpMatchArray | null;
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    const slug = greenhouseSlugFromUrl(url);
    if (slug) {
      return {
        ats: "greenhouse",
        slug,
        careersUrl: `https://boards.greenhouse.io/${slug}`,
      };
    }
  }
  if (host === "grnh.se" || host.endsWith(".grnh.se")) {
    const slug = greenhouseSlugFromUrl(url);
    if (slug) return { ats: "greenhouse", slug, careersUrl: rawUrl };
  }
  // Absolute greenhouse URLs embedded in query strings / redirects
  m = rawUrl.match(
    /https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/[^?\s"'<>]*\?for=|)?([a-zA-Z0-9_-]+)/i,
  );
  if (m) {
    const slug = m[1];
    if (slug && !INVALID_SLUGS.has(slug.toLowerCase())) {
      return {
        ats: "greenhouse",
        slug,
        careersUrl: `https://boards.greenhouse.io/${slug}`,
      };
    }
  }
  const forInString = rawUrl.match(/greenhouse\.io\/[^?\s"'<>]*[?&]for=([a-zA-Z0-9_-]+)/i);
  if (forInString && !INVALID_SLUGS.has(forInString[1].toLowerCase())) {
    return {
      ats: "greenhouse",
      slug: forInString[1],
      careersUrl: `https://boards.greenhouse.io/${forInString[1]}`,
    };
  }
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
  // Greenhouse embed scripts: .../embed/job_board/js?for=slug
  const ghFor = html.match(
    /(?:boards|job-boards)\.greenhouse\.io\/[^"'>\s]*[?&]for=([a-zA-Z0-9_-]+)/i,
  );
  if (ghFor && !INVALID_SLUGS.has(ghFor[1].toLowerCase())) {
    return {
      ats: "greenhouse",
      slug: ghFor[1],
      careersUrl: `https://boards.greenhouse.io/${ghFor[1]}`,
    };
  }

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
      if (!slug || INVALID_SLUGS.has(slug.toLowerCase())) continue;
      const careersUrl =
        ats === "greenhouse" ? `https://boards.greenhouse.io/${slug}` : match[0];
      return { ats, slug, careersUrl };
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
