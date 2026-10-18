"use client";

import { useMemo, useState } from "react";
import type { Company, Job } from "../src/ats/types";

interface Props {
  jobs: Job[];
  companies: Company[];
}

export default function JobBoard({ jobs, companies }: Props) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [department, setDepartment] = useState("");
  const [remote, setRemote] = useState<"any" | "remote" | "onsite">("any");

  const countries = useMemo(
    () => [...new Set(jobs.map((j) => j.licenceCountry).filter(Boolean))].sort(),
    [jobs],
  );
  const departments = useMemo(
    () => [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort(),
    [jobs],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (country && j.licenceCountry !== country) return false;
      if (department && j.department !== department) return false;
      if (remote === "remote" && !j.remote) return false;
      if (remote === "onsite" && j.remote) return false;
      if (!query) return true;
      const hay = `${j.title} ${j.company} ${j.location} ${j.department}`.toLowerCase();
      return hay.includes(query);
    });
  }, [jobs, q, country, department, remote]);

  const otherCareers = useMemo(
    () =>
      companies
        .filter((c) => c.ats === "other")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  const atsCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of companies) counts[c.ats] = (counts[c.ats] ?? 0) + 1;
    return counts;
  }, [companies]);

  return (
    <main>
      <header className="hero">
        <h1>MiCA Crypto Job Board</h1>
        <p>
          Open roles at MiCA-licensed crypto firms, pulled from public Greenhouse, Lever, Ashby,
          Workable, and Personio boards.
        </p>
        <div className="stats">
          <span>
            <strong>{jobs.length}</strong> jobs
          </span>
          <span>
            <strong>{companies.length}</strong> firms
          </span>
          <span>
            ATS:{" "}
            {Object.entries(atsCounts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ")}
          </span>
        </div>
      </header>

      <div className="filters">
        <label>
          Search
          <input
            type="search"
            placeholder="Title, company, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          Licence country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Remote
          <select
            value={remote}
            onChange={(e) => setRemote(e.target.value as "any" | "remote" | "onsite")}
          >
            <option value="any">Any</option>
            <option value="remote">Remote</option>
            <option value="onsite">On-site / hybrid</option>
          </select>
        </label>
      </div>

      <p className="results-meta">
        Showing {filtered.length} of {jobs.length} roles
      </p>

      {filtered.length === 0 ? (
        <p className="empty">No roles match these filters.</p>
      ) : (
        <ul className="job-list">
          {filtered.map((job) => (
            <li className="job-item" key={`${job.company}-${job.url}-${job.title}`}>
              <div>
                <h2>
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    {job.title}
                  </a>
                </h2>
                <p className="job-meta">
                  <span>{job.company}</span>
                  <span>{job.licenceCountry}</span>
                  {job.location ? <span>{job.location}</span> : null}
                  {job.department ? <span>{job.department}</span> : null}
                </p>
              </div>
              {job.remote ? <span className="badge">Remote</span> : null}
            </li>
          ))}
        </ul>
      )}

      <section className="section" id="careers-pages">
        <h2>Careers pages</h2>
        <p>
          Firms without a supported public ATS API. Links go to a discovered careers page when
          available, otherwise the company website.
        </p>
        <ul className="careers-list">
          {otherCareers.map((c) => {
            const href = c.careersUrl || c.website;
            return (
              <li key={`${c.name}-${c.website}`}>
                <a className="name" href={href} target="_blank" rel="noopener noreferrer">
                  {c.name}
                </a>
                {c.country ? <span className="country">{c.country}</span> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <footer>
        Data refreshes daily via GitHub Actions. Source: MiCA licence map firm list.
      </footer>
    </main>
  );
}
