import type { Company, Job } from "./types";
import { isRemote } from "./remote";

interface WorkableJob {
  id?: string;
  title: string;
  shortcode?: string;
  url?: string;
  location?: { city?: string; region?: string; country?: string; telecommuting?: boolean } | string;
  department?: string;
  created_at?: string;
  published_on?: string;
}

interface WorkableResponse {
  results?: WorkableJob[];
  jobs?: WorkableJob[];
}

function formatLocation(loc: WorkableJob["location"]): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  return [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
}

export async function fetchWorkableJobs(company: Company): Promise<Job[]> {
  if (!company.slug) return [];
  const url = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(company.slug)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Workable ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as WorkableResponse;
  const jobs = data.results ?? data.jobs ?? [];
  return jobs.map((j) => {
    const location = formatLocation(j.location);
    const telecommuting =
      typeof j.location === "object" && j.location !== null
        ? Boolean(j.location.telecommuting)
        : false;
    const remote = telecommuting ? isRemote(location + " remote") : isRemote(location);
    const short = j.shortcode || j.id;
    const jobUrl =
      j.url ||
      (short
        ? `https://apply.workable.com/${company.slug}/j/${short}/`
        : `https://apply.workable.com/${company.slug}/`);
    return {
      company: company.name,
      licenceCountry: company.country,
      title: j.title,
      location,
      remote,
      department: j.department ?? "",
      url: jobUrl,
      postedAt: j.published_on ?? j.created_at ?? null,
    };
  });
}
