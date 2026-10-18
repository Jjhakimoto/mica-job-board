import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchRawJobs, normalizeUrl, toJob } from "../lib/feeds";
import type { Company, FetchFailure, Job } from "../lib/types";

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "data", "companies.json");
const OUTPUT = path.join(ROOT, "data", "jobs.json");

const SUPPORTED = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "personio",
  "teamtailor",
  "recruitee",
  "smartrecruiters",
]);

async function main(): Promise<void> {
  const companies = JSON.parse(await readFile(INPUT, "utf8")) as Company[];
  const fetchedAt = new Date().toISOString();
  const jobs: Job[] = [];
  const failures: FetchFailure[] = [];
  const targets = companies.filter((company) => SUPPORTED.has(company.ats) && company.slug);

  let finished = 0;
  await Promise.all(
    targets.map(async (company) => {
      try {
        const rawJobs = await fetchRawJobs(company);
        for (const raw of rawJobs) {
          const job = toJob(company, raw, fetchedAt);
          if (job) jobs.push(job);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        failures.push({ company: company.name, ats: company.ats, reason: reason.slice(0, 240) });
        console.error(`fail ${company.name} (${company.ats}): ${reason}`);
      } finally {
        finished += 1;
        if (finished % 10 === 0 || finished === targets.length) {
          console.error(`fetched ${finished}/${targets.length}`);
        }
      }
    }),
  );

  const byUrl = new Map<string, Job>();
  for (const job of jobs) {
    const key = normalizeUrl(job.url);
    if (!byUrl.has(key)) byUrl.set(key, job);
  }
  const unique = [...byUrl.values()].sort((a, b) => {
    const posted = (b.postedAt ?? "").localeCompare(a.postedAt ?? "");
    if (posted !== 0) return posted;
    return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
  });

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(unique, null, 2)}\n`);

  const perCompany = new Map<string, number>();
  for (const job of unique) perCompany.set(job.company, (perCompany.get(job.company) ?? 0) + 1);
  const top = [...perCompany.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15);

  console.log("");
  console.log(`total jobs: ${unique.length}`);
  console.log("top companies:");
  for (const [company, count] of top) {
    console.log(`${String(count).padStart(4)}  ${company}`);
  }
  console.log(`failures: ${failures.length}`);
  for (const failure of failures) {
    console.log(`- ${failure.company} (${failure.ats}): ${failure.reason}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
