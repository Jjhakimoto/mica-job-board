import { fetchText } from "./http";
import type { Company, Job } from "./types";
import { classifyDepartment, keepJob } from "./classify";

export type RawJob = {
  sourceId: string;
  title: string;
  location: string;
  url: string;
  postedAt: string | null;
  remoteHint: boolean;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function locationFromParts(parts: unknown[]): string {
  return parts
    .flatMap((part) => {
      if (typeof part === "string") return [part.trim()];
      if (part && typeof part === "object") {
        const record = part as Record<string, unknown>;
        return [record.city, record.region, record.country, record.name, record.fullLocation]
          .filter((item): item is string => typeof item === "string" && item.trim() !== "")
          .map((item) => item.trim());
      }
      return [];
    })
    .filter(Boolean)
    .filter((part, index, all) => all.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index)
    .join(", ");
}

function xmlTag(block: string, tag: string): string {
  const match = new RegExp(
    `<${tag}\\b[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    "i",
  ).exec(block);
  return (match?.[1] ?? match?.[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function getBody(url: string, accept: string): Promise<string> {
  const response = await fetchText(url, accept, 12_000_000);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text;
}

async function firstBody(urls: string[], accept: string): Promise<string> {
  let lastError = "no endpoint";
  for (const url of urls) {
    try {
      return await getBody(url, accept);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
    }
  }
  throw new Error(lastError);
}

export async function fetchRawJobs(company: Company): Promise<RawJob[]> {
  const slug = company.slug;
  if (!slug) throw new Error("missing slug");
  switch (company.ats) {
    case "greenhouse":
      try {
        return parseGreenhouse(
          await getBody(
            `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
            "application/json",
          ),
        );
      } catch (error) {
        try {
          return parseLever(
            await getBody(
              `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
              "application/json",
            ),
          );
        } catch {
          throw error;
        }
      }
    case "lever":
      return parseLever(
        await firstBody(
          [
            `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
            `https://api.eu.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
          ],
          "application/json",
        ),
      );
    case "ashby":
      return parseAshby(
        await getBody(
          `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`,
          "application/json",
        ),
      );
    case "workable":
      return parseWorkable(
        await getBody(
          `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`,
          "application/json",
        ),
      );
    case "personio": {
      const host = slug.toLowerCase();
      let text = "";
      let site = "de";
      try {
        text = await getBody(`https://${host}.jobs.personio.de/xml`, "application/xml");
      } catch (error) {
        try {
          text = await getBody(`https://${host}.jobs.personio.com/xml`, "application/xml");
          site = "com";
        } catch {
          throw error;
        }
      }
      return parsePersonio(text, host, site);
    }
    case "teamtailor":
      return fetchTeamtailor(slug);
    case "recruitee":
      return parseRecruitee(
        await getBody(`https://${slug.toLowerCase()}.recruitee.com/api/offers/`, "application/json"),
      );
    case "smartrecruiters":
      return fetchSmartRecruiters(slug);
    default:
      return [];
  }
}

export function parseGreenhouse(text: string): RawJob[] {
  const data = JSON.parse(text) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((job) => {
    const location = locationFromParts([job.location]);
    return {
      sourceId: String(job.id ?? ""),
      title: asString(job.title),
      location,
      url: asString(job.absolute_url),
      postedAt: toIso(job.updated_at) ?? toIso(job.first_published),
      remoteHint: false,
    };
  });
}

export function parseLever(text: string): RawJob[] {
  const data = JSON.parse(text) as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) return [];
  return data.map((job) => {
    const categories = (job.categories ?? {}) as Record<string, unknown>;
    const location = locationFromParts([categories.location, job.country, job.workplaceType]);
    return {
      sourceId: asString(job.id),
      title: asString(job.text),
      location,
      url: asString(job.hostedUrl) || asString(job.applyUrl),
      postedAt: toIso(job.createdAt),
      remoteHint: asString(job.workplaceType).toLowerCase() === "remote",
    };
  });
}

export function parseAshby(text: string): RawJob[] {
  const data = JSON.parse(text) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).filter((job) => job.isListed !== false).map((job) => {
    const address = ((job.address as { postalAddress?: Record<string, unknown> } | undefined)?.postalAddress ??
      {}) as Record<string, unknown>;
    const location = locationFromParts([
      job.location,
      address.addressLocality,
      address.addressRegion,
      address.addressCountry,
      ...(Array.isArray(job.secondaryLocations) ? job.secondaryLocations : []),
    ]);
    return {
      sourceId: asString(job.id) || asString(job.jobUrl),
      title: asString(job.title),
      location,
      url: asString(job.jobUrl) || asString(job.applyUrl),
      postedAt: toIso(job.publishedAt),
      remoteHint: job.isRemote === true,
    };
  });
}

export function parseWorkable(text: string): RawJob[] {
  const data = JSON.parse(text) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((job) => {
    const locations = Array.isArray(job.locations) ? job.locations : [];
    const location = locationFromParts([job.location, ...locations]);
    return {
      sourceId: asString(job.shortcode) || asString(job.id),
      title: asString(job.title),
      location,
      url: asString(job.url) || asString(job.shortlink) || asString(job.application_url),
      postedAt: toIso(job.created_at) ?? toIso(job.published_on),
      remoteHint: job.telecommuting === true,
    };
  });
}

export function parsePersonio(text: string, slug: string, site = "de"): RawJob[] {
  const blocks = text.match(/<position\b[\s\S]*?<\/position>/gi) ?? [];
  return blocks.map((block) => {
    const id = xmlTag(block, "id");
    const office = xmlTag(block, "office");
    const additional = xmlTag(block, "additionalOffices");
    const schedule = xmlTag(block, "schedule");
    return {
      sourceId: id,
      title: xmlTag(block, "name"),
      location: [office, additional].filter(Boolean).join(", "),
      url: id ? `https://${slug.toLowerCase()}.jobs.personio.${site}/job/${id}` : "",
      postedAt: toIso(xmlTag(block, "createdAt")),
      remoteHint: /remote/i.test(`${office} ${schedule}`),
    };
  });
}

function parseTeamtailorJson(text: string): RawJob[] {
  const data = JSON.parse(text) as unknown;
  const records = Array.isArray(data)
    ? data
    : Array.isArray((data as { jobs?: unknown[] }).jobs)
      ? (data as { jobs: unknown[] }).jobs
      : Array.isArray((data as { data?: unknown[] }).data)
        ? (data as { data: unknown[] }).data
        : [];
  return records.map((entry) => {
    const job = (entry ?? {}) as Record<string, unknown>;
    const attributes = (job.attributes ?? {}) as Record<string, unknown>;
    const links = (job.links ?? {}) as Record<string, unknown>;
    const title = asString(job.title) || asString(attributes.title);
    const url =
      asString(job.url) ||
      asString(links["careersite-job-url"]) ||
      asString(links.url) ||
      asString(attributes.url);
    const location = locationFromParts([
      job.location,
      job.locations,
      attributes.location,
      attributes["location-name"],
    ]);
    const remoteStatus = asString(attributes["remote-status"] ?? job.remoteStatus).toLowerCase();
    return {
      sourceId: asString(job.id) || url,
      title,
      location,
      url,
      postedAt: toIso(job.publishedAt ?? job.created_at ?? attributes["created-at"]),
      remoteHint: remoteStatus === "fully" || remoteStatus === "hybrid" || remoteStatus === "remote",
    };
  });
}

function parseRss(text: string): RawJob[] {
  const items = text.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => ({
    sourceId: xmlTag(item, "guid") || xmlTag(item, "link"),
    title: xmlTag(item, "title"),
    location: xmlTag(item, "location") || xmlTag(item, "city"),
    url: xmlTag(item, "link"),
    postedAt: toIso(xmlTag(item, "pubDate") || xmlTag(item, "published")),
    remoteHint: /remote/i.test(item),
  }));
}

async function fetchTeamtailor(slug: string): Promise<RawJob[]> {
  const host = `${slug.toLowerCase()}.teamtailor.com`;
  try {
    return parseTeamtailorJson(await getBody(`https://${host}/jobs.json`, "application/json"));
  } catch {
    return parseRss(await getBody(`https://${host}/jobs.rss`, "application/xml"));
  }
}

export function parseRecruitee(text: string): RawJob[] {
  const data = JSON.parse(text) as { offers?: Array<Record<string, unknown>> };
  return (data.offers ?? []).map((job) => {
    const location =
      asString(job.location) ||
      locationFromParts([job.city, job.country, job.state]);
    return {
      sourceId: String(job.id ?? ""),
      title: asString(job.title),
      location,
      url: asString(job.careers_url) || asString(job.careers_apply_url) || asString(job.url),
      postedAt: toIso(job.published_at) ?? toIso(job.created_at),
      remoteHint: job.remote === true,
    };
  });
}

async function fetchSmartRecruiters(slug: string): Promise<RawJob[]> {
  const jobs: RawJob[] = [];
  const limit = 100;
  for (let offset = 0; offset < 1000; offset += limit) {
    const text = await getBody(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${limit}&offset=${offset}`,
      "application/json",
    );
    const data = JSON.parse(text) as { content?: Array<Record<string, unknown>>; totalFound?: number };
    const content = data.content ?? [];
    for (const job of content) {
      const locationRecord = (job.location ?? {}) as Record<string, unknown>;
      jobs.push({
        sourceId: asString(job.id) || asString(job.uuid),
        title: asString(job.name),
        location: asString(locationRecord.fullLocation) || locationFromParts([locationRecord]),
        url: asString(job.ref) || asString(job.applyUrl),
        postedAt: toIso(job.releasedDate),
        remoteHint: locationRecord.remote === true,
      });
    }
    if (content.length < limit) break;
    if (typeof data.totalFound === "number" && offset + limit >= data.totalFound) break;
  }
  return jobs;
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "") || "";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url.trim();
  }
}

export function toJob(company: Company, raw: RawJob, fetchedAt: string): Job | null {
  if (!raw.title || !raw.url) return null;
  const decision = keepJob(raw.title, raw.location, raw.remoteHint);
  if (!decision.keep) return null;
  const url = raw.url;
  return {
    id: `${company.ats}:${company.slug}:${raw.sourceId || normalizeUrl(url)}`,
    company: company.name,
    licenceCountry: company.licenceCountry,
    title: raw.title,
    location: raw.location || (decision.remote ? "Remote" : ""),
    remote: decision.remote,
    department: classifyDepartment(raw.title),
    url,
    postedAt: raw.postedAt,
    fetchedAt,
  };
}
