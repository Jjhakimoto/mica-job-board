import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Company, FirmRow } from "../src/ats/types";
import { discoverCompany } from "../src/discover/resolve";

const ROOT = resolve(import.meta.dirname, "..");
const FIRMS_CSV = resolve(ROOT, "data/firms.csv");
const OUT = resolve(ROOT, "data/companies.json");
const CONCURRENCY = 5;

function parseCsv(text: string): FirmRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const rows: FirmRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (cols[0] ?? "").trim();
    const country = (cols[1] ?? "").trim();
    const website = (cols[2] ?? "").trim();
    if (!name || !website) continue;
    rows.push({ name, country, website });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
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
  const firms = parseCsv(readFileSync(FIRMS_CSV, "utf8"));
  console.log(`Discovering ATS for ${firms.length} firms (concurrency=${CONCURRENCY})…`);

  const companies = await mapPool(firms, CONCURRENCY, async (firm, index) => {
    const label = `[${index + 1}/${firms.length}] ${firm.name}`;
    try {
      const company = await discoverCompany(firm);
      console.log(
        `${label} → ${company.ats}${company.slug ? `:${company.slug}` : ""}${
          company.careersUrl ? ` (${company.careersUrl})` : ""
        }`,
      );
      return company;
    } catch (err) {
      console.warn(`${label} failed:`, err instanceof Error ? err.message : err);
      const fallback: Company = {
        name: firm.name,
        country: firm.country,
        website: firm.website,
        careersUrl: null,
        ats: "other",
        slug: null,
      };
      return fallback;
    }
  });

  mkdirSync(resolve(ROOT, "data"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(companies, null, 2) + "\n", "utf8");

  const counts = companies.reduce<Record<string, number>>((acc, c) => {
    acc[c.ats] = (acc[c.ats] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${companies.length} companies → ${OUT}`);
  console.log("ATS counts:", counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
