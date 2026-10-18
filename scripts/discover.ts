import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { careerCandidates, detectAts, extractLinks, linkedInJobsUrl, looksLikeCareersPage, probeUrls } from "../lib/ats";
import { parseCsv, readFirm } from "../lib/csv";
import { fetchText, type Fetched } from "../lib/http";
import { ATS_VALUES, type Ats, type Company, type CompanyStatus } from "../lib/types";

const PLATFORM_HOSTS = [
  "figma.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "google.com",
  "notion.so",
  "notion.site",
  "github.com",
  "medium.com",
];

function isPlatformSite(website: string): boolean {
  try {
    const host = new URL(website).hostname.replace(/^www\./, "").toLowerCase();
    return PLATFORM_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return false;
  }
}

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "firms.csv");
const OUTPUT = path.join(ROOT, "data", "companies.json");

const cache = new Map<string, Promise<Fetched | null>>();

function load(url: string): Promise<Fetched | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  const pending = fetchText(url).catch(() => null);
  cache.set(url, pending);
  return pending;
}

async function discoverFirm(firm: { name: string; licenceCountry: string; website: string | null }): Promise<Company> {
  const base: Company = {
    name: firm.name,
    licenceCountry: firm.licenceCountry,
    website: firm.website,
    careersUrl: null,
    ats: "none_found",
    slug: null,
    status: "none_found",
  };
  if (!firm.website || isPlatformSite(firm.website)) return base;

  let sawResponse = false;
  let networkError = false;
  const remember = async (url: string): Promise<Fetched | null> => {
    const response = await load(url);
    if (response) sawResponse = true;
    else networkError = true;
    return response;
  };

  const homepage = await remember(firm.website);
  const pages: Fetched[] = [];
  if (homepage?.ok) pages.push(homepage);

  const homepageLinks = homepage?.ok ? extractLinks(homepage.text, homepage.url) : [];
  let hit = homepage?.ok ? detectAts(homepage.text) : null;
  let careersUrl: string | null = null;

  const candidates = homepage?.ok ? careerCandidates(homepageLinks, new URL(homepage.url)) : [];
  if (!hit) {
    for (const candidate of candidates) {
      const page = await remember(candidate);
      if (!page?.ok) continue;
      pages.push(page);
      hit = detectAts(page.text) ?? hit;
      if (looksLikeCareersPage(page.url, page.text, candidate)) {
        careersUrl = page.url;
        if (hit) break;
      }
    }
  } else if (candidates[0]) {
    careersUrl = candidates[0];
  }

  if (!hit && !careersUrl) {
    for (const probe of probeUrls(firm.website)) {
      const page = await remember(probe);
      if (!page?.ok) continue;
      pages.push(page);
      hit = detectAts(`${page.url}\n${page.text}`) ?? hit;
      if (looksLikeCareersPage(page.url, page.text, probe) || hit) {
        careersUrl = page.url;
        if (hit) break;
      }
    }
  }

  if (!hit) {
    for (const page of pages) {
      hit = detectAts(page.text);
      if (hit) break;
    }
  }

  if (!careersUrl && hit) careersUrl = hit.url;
  if (!careersUrl) {
    const linkedIn = linkedInJobsUrl(homepageLinks);
    if (linkedIn) careersUrl = linkedIn;
  }

  let ats: Ats = "none_found";
  let status: CompanyStatus = "none_found";
  if (hit) {
    ats = hit.ats;
    status = "ok";
  } else if (careersUrl) {
    ats = "other";
    status = "ok";
  } else if (!sawResponse && networkError) {
    status = "error";
  }

  return {
    ...base,
    careersUrl,
    ats,
    slug: hit?.slug ?? null,
    status,
  };
}

async function main(): Promise<void> {
  const csv = await readFile(INPUT, "utf8");
  const firms = parseCsv(csv)
    .map(readFirm)
    .filter((firm): firm is NonNullable<typeof firm> => firm !== null);

  const companies: Company[] = [];
  let finished = 0;
  await Promise.all(
    firms.map(async (firm) => {
      const company = await discoverFirm(firm).catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.error(`error ${firm.name}: ${reason}`);
        return {
          name: firm.name,
          licenceCountry: firm.licenceCountry,
          website: firm.website,
          careersUrl: null,
          ats: "none_found" as const,
          slug: null,
          status: "error" as const,
        };
      });
      companies.push(company);
      finished += 1;
      if (finished % 25 === 0 || finished === firms.length) {
        console.error(`discovered ${finished}/${firms.length}`);
      }
    }),
  );

  companies.sort((a, b) => a.name.localeCompare(b.name));
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(companies, null, 2)}\n`);

  const counts = new Map<string, number>();
  for (const ats of ATS_VALUES) counts.set(ats, 0);
  let errors = 0;
  for (const company of companies) {
    counts.set(company.ats, (counts.get(company.ats) ?? 0) + 1);
    if (company.status === "error") errors += 1;
  }

  console.log("");
  console.log("ATS                  Firms");
  for (const ats of ATS_VALUES) {
    console.log(`${ats.padEnd(20)} ${counts.get(ats) ?? 0}`);
  }
  console.log(`${"unreachable".padEnd(20)} ${errors} (included in none_found)`);
  console.log(`${"total".padEnd(20)} ${companies.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
