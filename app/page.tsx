import jobs from "../data/jobs.json";
import companies from "../data/companies.json";
import type { Company, Job } from "../src/ats/types";
import JobBoard from "./JobBoard";

export default function HomePage() {
  return <JobBoard jobs={jobs as Job[]} companies={companies as Company[]} />;
}
