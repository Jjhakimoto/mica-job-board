"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { EmailSignup } from "@/components/EmailSignup";
import { countryLabel } from "@/lib/countries";
import { postedWithin } from "@/lib/classify";
import { DEPARTMENTS, type Company, type Job } from "@/lib/types";

const POSTED_OPTIONS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

function formatStamp(iso: string): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hourCycle: "h23",
  }).format(new Date(iso))} UTC`;
}

function formatPosted(iso: string | null): string {
  if (!iso) return "Date unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function JobBoard({ jobs, companies }: { jobs: Job[]; companies: Company[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const country = params.get("country") ?? "";
  const department = params.get("department") ?? "";
  const remoteOnly = params.get("remote") === "1";
  const posted = params.get("posted") ?? "";
  const query = params.get("q") ?? "";

  function update(next: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) search.delete(key);
      else search.set(key, value);
    }
    const text = search.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (country && job.licenceCountry !== country) return false;
      if (department && job.department !== department) return false;
      if (remoteOnly && !job.remote) return false;
      if (posted && !postedWithin(job.postedAt, Number(posted))) return false;
      if (!needle) return true;
      return `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(needle);
    });
  }, [jobs, country, department, remoteOnly, posted, query]);

  const countries = useMemo(
    () => [...new Set(jobs.map((job) => job.licenceCountry))].sort((a, b) => a.localeCompare(b)),
    [jobs],
  );
  const firms = new Set(visible.map((job) => job.company)).size;
  const updated = jobs.reduce<string | null>((latest, job) => {
    if (!latest || job.fetchedAt > latest) return job.fetchedAt;
    return latest;
  }, null);
  const otherFirms = companies
    .filter((company) => company.ats === "other" && company.careersUrl)
    .sort((a, b) => a.name.localeCompare(b.name));
  const filtersActive = Boolean(country || department || remoteOnly || posted || query);

  return (
    <div>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <p className="font-sans text-sm font-medium uppercase tracking-wide text-emerald-800">EU and EEA</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Jobs at MiCA-licensed crypto firms
          </h1>
          <p className="mt-4 font-sans text-lg text-stone-700">
            {visible.length} open {visible.length === 1 ? "role" : "roles"} at {firms} licensed{" "}
            {firms === 1 ? "firm" : "firms"}
          </p>
          <p className="mt-1 font-sans text-sm text-stone-500">
            {updated ? `Updated ${formatStamp(updated)}` : "Not updated yet"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <form
          className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="block font-sans text-sm lg:col-span-2">
            <span className="mb-1 block text-stone-600">Search</span>
            <input
              value={query}
              onChange={(event) => update({ q: event.target.value || null })}
              placeholder="Title, company, or location"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block font-sans text-sm">
            <span className="mb-1 block text-stone-600">Licence country</span>
            <select
              value={country}
              onChange={(event) => update({ country: event.target.value || null })}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none ring-emerald-700 focus:ring-2"
            >
              <option value="">All countries</option>
              {countries.map((code) => (
                <option key={code} value={code}>
                  {countryLabel(code)}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-sans text-sm">
            <span className="mb-1 block text-stone-600">Department</span>
            <select
              value={department}
              onChange={(event) => update({ department: event.target.value || null })}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none ring-emerald-700 focus:ring-2"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-sans text-sm">
            <span className="mb-1 block text-stone-600">Date posted</span>
            <select
              value={posted}
              onChange={(event) => update({ posted: event.target.value || null })}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none ring-emerald-700 focus:ring-2"
            >
              <option value="">Any time</option>
              {POSTED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-stone-800 sm:col-span-2 lg:col-span-4">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(event) => update({ remote: event.target.checked ? "1" : null })}
              className="h-4 w-4 accent-emerald-800"
            />
            Remote only
          </label>
        </form>

        {filtersActive ? (
          <button
            type="button"
            onClick={() => update({ country: null, department: null, remote: null, posted: null, q: null })}
            className="mt-3 font-sans text-sm text-emerald-900 underline"
          >
            Clear filters
          </button>
        ) : null}

        <section className="mt-6 space-y-3">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center font-sans text-stone-600">
              No roles match these filters.
            </p>
          ) : (
            visible.map((job) => (
              <article key={job.id} className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold leading-tight">{job.title}</h2>
                    <p className="mt-1 font-sans text-sm text-stone-600">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 font-sans text-xs">
                      {job.remote ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-900">Remote</span>
                      ) : null}
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-700">{job.department}</span>
                      <span className="text-stone-500">{formatPosted(job.postedAt)}</span>
                    </div>
                  </div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex justify-center rounded-lg bg-stone-900 px-4 py-2 text-center font-sans text-sm font-medium text-white hover:bg-stone-700"
                  >
                    Apply
                  </a>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Careers pages</h2>
          <p className="mt-2 font-sans text-sm text-stone-600">
            Licensed firms whose careers site is not on a supported job board. Open the page and apply there.
          </p>
          {otherFirms.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-stone-500">No separate careers pages yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {otherFirms.map((company) => (
                <li key={company.name} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-sans text-sm font-medium">{company.name}</span>
                  <a
                    href={company.careersUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="font-sans text-sm text-emerald-900 underline break-all"
                  >
                    {company.careersUrl}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-12">
          <EmailSignup />
        </div>
      </main>
    </div>
  );
}
