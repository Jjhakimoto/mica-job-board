import { Suspense } from "react";
import { JobBoard } from "@/components/JobBoard";
import companiesData from "@/data/companies.json";
import jobsData from "@/data/jobs.json";
import type { Company, Job } from "@/lib/types";

export default function Page() {
  const jobs = jobsData as Job[];
  const companies = companiesData as Company[];
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-4 py-16 text-stone-600">Loading roles…</p>}>
      <JobBoard jobs={jobs} companies={companies} />
    </Suspense>
  );
}
