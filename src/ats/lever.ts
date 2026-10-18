import type { Company, Job } from "./types";
import { isRemote } from "./remote";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories?: {
    location?: string;
    department?: string;
    team?: string;
    commitment?: string;
  };
  workplaceType?: string;
  createdAt?: number;
}

export async function fetchLeverJobs(company: Company): Promise<Job[]> {
  if (!company.slug) return [];
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.slug)}?mode=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Lever ${company.slug}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as LeverPosting[];
  return (Array.isArray(data) ? data : []).map((j) => {
    const location = j.categories?.location ?? "";
    const department = j.categories?.department || j.categories?.team || "";
    return {
      company: company.name,
      licenceCountry: company.country,
      title: j.text,
      location,
      remote: isRemote(location, j.workplaceType),
      department,
      url: j.hostedUrl || j.applyUrl || "",
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    };
  });
}
