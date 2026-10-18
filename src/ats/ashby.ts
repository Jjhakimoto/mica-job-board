import type { Company, Job } from "./types";
import { isRemote } from "./remote";

interface AshbyJob {
  id: string;
  title: string;
  jobUrl?: string;
  applyUrl?: string;
  location?: string;
  department?: string;
  team?: string;
  isRemote?: boolean;
  publishedAt?: string;
  employmentType?: string;
}

interface AshbyResponse {
  jobs?: AshbyJob[];
}

export async function fetchAshbyJobs(company: Company): Promise<Job[]> {
  if (!company.slug) return [];
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.slug)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Ashby ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as AshbyResponse;
  return (data.jobs ?? []).map((j) => {
    const location = j.location ?? "";
    const department = j.department || j.team || "";
    const remote =
      typeof j.isRemote === "boolean" ? j.isRemote && !/hybrid/i.test(location) : isRemote(location);
    return {
      company: company.name,
      licenceCountry: company.country,
      title: j.title,
      location,
      remote,
      department,
      url: j.jobUrl || j.applyUrl || "",
      postedAt: j.publishedAt ?? null,
    };
  });
}
