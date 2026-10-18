import type { Company, Job } from "./types";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchAshbyJobs } from "./ashby";
import { fetchWorkableJobs } from "./workable";
import { fetchPersonioJobs } from "./personio";

export type { Company, Job, AtsKind, FirmRow } from "./types";
export { isRemote } from "./remote";

export async function fetchJobsForCompany(company: Company): Promise<Job[]> {
  switch (company.ats) {
    case "greenhouse":
      return fetchGreenhouseJobs(company);
    case "lever":
      return fetchLeverJobs(company);
    case "ashby":
      return fetchAshbyJobs(company);
    case "workable":
      return fetchWorkableJobs(company);
    case "personio":
      return fetchPersonioJobs(company);
    case "other":
      return [];
    default:
      return [];
  }
}
