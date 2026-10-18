import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Company, Job } from "../src/ats/types";
import { fetchJobsForCompany } from "../src/ats/index";

const ROOT = resolve(import.meta.dirname, "..");
const COMPANIES = resolve(ROOT, "data/companies.json");
const OUT = resolve(ROOT, "data/jobs.json");
const LOG = resolve(ROOT, "data/fetch-log.json");
const CONCURRENCY = 5;

interface FetchFailure {
  company: string;
  ats: string;
  slug: string | null;
  error: string;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const companies = JSON.parse(readFileSync(COMPANIES, "utf8")) as Company[];
  const fetchable = companies.filter((c) => c.ats !== "other" && c.slug);
  console.log(
    `Fetching jobs for ${fetchable.length}/${companies.length} companies (skipping ats=other)…`,
  );

  const failures: FetchFailure[] = [];
  const jobBatches = await mapPool(fetchable, CONCURRENCY, async (company, index) => {
    const label = `[${index + 1}/${fetchable.length}] ${company.name} (${company.ats}:${company.slug})`;
    try {
      const jobs = await fetchJobsForCompany(company);
      console.log(`${label} → ${jobs.length} jobs`);
      return jobs;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`${label} FAILED: ${message}`);
      failures.push({
        company: company.name,
        ats: company.ats,
        slug: company.slug,
        error: message,
      });
      return [] as Job[];
    }
  });

  const jobs = jobBatches.flat().filter((j) => j.title && j.url);
  // Stable sort for cleaner diffs
  jobs.sort((a, b) => {
    const c = a.company.localeCompare(b.company);
    if (c !== 0) return c;
    return a.title.localeCompare(b.title);
  });

  mkdirSync(resolve(ROOT, "data"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(jobs, null, 2) + "\n", "utf8");
  writeFileSync(
    LOG,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        companiesAttempted: fetchable.length,
        jobs: jobs.length,
        failures,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Wrote ${jobs.length} jobs → ${OUT}`);
  console.log(`Failures: ${failures.length} (see ${LOG})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
