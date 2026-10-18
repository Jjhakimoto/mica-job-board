import type { AtsKind, Company, FirmRow } from "../ats/types";
import {
  CAREERS_PATHS,
  detectAtsFromHtml,
  detectAtsFromUrl,
  extractCareersLinks,
  type AtsDetection,
} from "./detect";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MiCAJobBoard/1.0; +https://github.com/Jjhakimoto/mica-job-board)";

async function fetchText(
  url: string,
): Promise<{ ok: boolean; status: number; url: string; body: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, body };
  } catch {
    return null;
  }
}

function sameSite(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "");
    const hb = new URL(b).hostname.replace(/^www\./, "");
    return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`);
  } catch {
    return false;
  }
}

function asCompany(
  firm: FirmRow,
  detection: AtsDetection | null,
  careersUrl: string | null,
): Company {
  if (detection && detection.ats !== "other") {
    return {
      name: firm.name,
      country: firm.country,
      website: firm.website,
      careersUrl: detection.careersUrl || careersUrl,
      ats: detection.ats,
      slug: detection.slug,
    };
  }
  return {
    name: firm.name,
    country: firm.country,
    website: firm.website,
    careersUrl: careersUrl || detection?.careersUrl || null,
    ats: "other" as AtsKind,
    slug: null,
  };
}

export async function discoverCompany(firm: FirmRow): Promise<Company> {
  let website = firm.website.trim();
  if (!website) {
    return asCompany(firm, null, null);
  }
  if (!/^https?:\/\//i.test(website)) {
    website = `https://${website}`;
  }

  // 1) Check website URL itself for ATS host
  const fromWebsite = detectAtsFromUrl(website);
  if (fromWebsite) return asCompany(firm, fromWebsite, fromWebsite.careersUrl);

  // 2) Try common careers paths
  let bestCareersUrl: string | null = null;
  for (const path of CAREERS_PATHS) {
    let candidate: string;
    try {
      candidate = new URL(path, website).toString();
    } catch {
      continue;
    }
    const res = await fetchText(candidate);
    if (!res || !res.ok) continue;

    // Prefer same-site or known ATS hosts
    const fromFinal = detectAtsFromUrl(res.url);
    if (fromFinal) return asCompany(firm, fromFinal, res.url);

    const fromHtml = detectAtsFromHtml(res.body, res.url);
    if (fromHtml && fromHtml.ats !== "other") {
      return asCompany(firm, fromHtml, fromHtml.careersUrl || res.url);
    }

    if (!bestCareersUrl && (sameSite(res.url, website) || /careers|jobs|join/i.test(res.url))) {
      bestCareersUrl = res.url;
      // Follow embedded careers links one hop
      const links = extractCareersLinks(res.body, res.url);
      for (const link of links.slice(0, 8)) {
        const fromLink = detectAtsFromUrl(link);
        if (fromLink) return asCompany(firm, fromLink, link);
        // Only fetch external ATS-looking or careers links
        if (
          /lever|greenhouse|ashby|workable|personio|careers|jobs|join/i.test(link)
        ) {
          const hop = await fetchText(link);
          if (!hop) continue;
          const d1 = detectAtsFromUrl(hop.url);
          if (d1) return asCompany(firm, d1, hop.url);
          const d2 = detectAtsFromHtml(hop.body, hop.url);
          if (d2 && d2.ats !== "other") {
            return asCompany(firm, d2, d2.careersUrl || hop.url);
          }
          if (!bestCareersUrl) bestCareersUrl = hop.url;
        }
      }
    }
  }

  // 3) Homepage scrape
  const home = await fetchText(website);
  if (home?.ok) {
    const fromHomeUrl = detectAtsFromUrl(home.url);
    if (fromHomeUrl) return asCompany(firm, fromHomeUrl, home.url);

    const fromHomeHtml = detectAtsFromHtml(home.body, home.url);
    if (fromHomeHtml && fromHomeHtml.ats !== "other") {
      return asCompany(firm, fromHomeHtml, fromHomeHtml.careersUrl);
    }

    const links = extractCareersLinks(home.body, home.url);
    if (!bestCareersUrl && links[0]) bestCareersUrl = links[0];

    for (const link of links.slice(0, 10)) {
      const direct = detectAtsFromUrl(link);
      if (direct) return asCompany(firm, direct, link);

      const hop = await fetchText(link);
      if (!hop) continue;
      const d1 = detectAtsFromUrl(hop.url);
      if (d1) return asCompany(firm, d1, hop.url);
      const d2 = detectAtsFromHtml(hop.body, hop.url);
      if (d2 && d2.ats !== "other") {
        return asCompany(firm, d2, d2.careersUrl || hop.url);
      }
      if (!bestCareersUrl && /careers|jobs|join/i.test(hop.url)) {
        bestCareersUrl = hop.url;
      }
    }
  }

  return asCompany(firm, null, bestCareersUrl);
}
