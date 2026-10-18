import type { Company, Job } from "./types";
import { isRemote } from "./remote";

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  departments?: { name?: string }[];
  offices?: { name?: string }[];
  metadata?: unknown[];
}

interface GhResponse {
  jobs?: GhJob[];
}

export async function fetchGreenhouseJobs(company: Company): Promise<Job[]> {
  if (!company.slug) return [];
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.slug)}/jobs?content=true`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Greenhouse ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as GhResponse;
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    const location = j.location?.name ?? j.offices?.[0]?.name ?? "";
    const department = j.departments?.map((d) => d.name).filter(Boolean).join(", ") || "";
    return {
      company: company.name,
      licenceCountry: company.country,
      title: j.title,
      location,
      remote: isRemote(location),
      department,
      url: j.absolute_url,
      postedAt: j.first_published ?? j.updated_at ?? null,
    };
  });
}
