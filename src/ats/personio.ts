import type { Company, Job } from "./types";
import { isRemote } from "./remote";

const PERSONIO_TLDS = ["de", "com", "ch", "at", "nl", "fr", "es", "it", "uk"];

function textContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function parsePersonioXml(xml: string, company: Company, boardHost: string): Job[] {
  const positions = xml.match(/<position\b[\s\S]*?<\/position>/gi) ?? [];
  return positions.map((block) => {
    const title = textContent(block, "name") || textContent(block, "title");
    const office = textContent(block, "office");
    const city = textContent(block, "city");
    const country = textContent(block, "country");
    const schedule = textContent(block, "schedule");
    const department = textContent(block, "department");
    const id = textContent(block, "id");
    const createdAt = textContent(block, "createdAt") || textContent(block, "created_at");
    const location = [office || city, country].filter(Boolean).join(", ");
    const remote = isRemote(`${location} ${schedule}`);
    const url = id
      ? `https://${boardHost}/job/${id}`
      : `https://${boardHost}`;
    return {
      company: company.name,
      licenceCountry: company.country,
      title,
      location,
      remote,
      department,
      url,
      postedAt: createdAt || null,
    };
  });
}

export async function fetchPersonioJobs(company: Company): Promise<Job[]> {
  if (!company.slug) return [];

  // Prefer TLD from known careers URL when available
  const preferred: string[] = [];
  if (company.careersUrl) {
    try {
      const host = new URL(company.careersUrl).hostname;
      const m = host.match(/\.jobs\.personio\.([a-z.]+)$/i);
      if (m) preferred.push(m[1].replace(/\.$/, ""));
    } catch {
      /* ignore */
    }
  }
  const tlds = [...new Set([...preferred, ...PERSONIO_TLDS])];

  let lastError: Error | null = null;
  for (const tld of tlds) {
    const host = `${company.slug}.jobs.personio.${tld}`;
    const url = `https://${host}/xml`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(20_000),
        redirect: "follow",
      });
      if (!res.ok) {
        lastError = new Error(`Personio ${host}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      if (!/<position\b/i.test(xml) && !/<workzag-jobs/i.test(xml)) {
        lastError = new Error(`Personio ${host}: empty or unexpected XML`);
        continue;
      }
      return parsePersonioXml(xml, company, host);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`Personio ${company.slug}: all TLDs failed`);
}
