# mica-job-board

Open roles at crypto firms licensed under MiCA. The site is a static Next.js app. Firm and job data live in JSON files, with no database and no accounts.

`firms.csv` is the list of licensed firms. `data/companies.json` records each firm's careers page and applicant tracking system. `data/jobs.json` is the normalised list of EU and EEA roles.

## Discover careers pages

Discovery reads `firms.csv` and writes `data/companies.json`. For each firm it opens the website, looks for a careers page (`/careers`, `/jobs`, `/join-us`, `/about/careers`, footer links, then a LinkedIn jobs link), and detects Greenhouse, Lever, Ashby, Workable, Personio, Teamtailor, Recruitee, or SmartRecruiters.

```bash
npm install
npm run discover
```

The command prints how many firms use each system, how many have an unclassified careers page (`other`), how many had no page (`none_found`), and how many could not be reached (`error`). Pages that only render jobs in the browser, with no link in the HTML, are recorded as `other` or `none_found`.

## Fetch jobs

Fetching reads `data/companies.json` and calls each supported public job feed. One failed company is logged and skipped. Roles outside the EU/EEA, and remote roles limited to the US, UK, or APAC, are left out. Results are written to `data/jobs.json`.

```bash
npm run fetch
```

The command prints the total, the 15 firms with the most open roles, and any failures.

## Develop and deploy

```bash
npm run dev
npm run build
```

`npm run build` writes a static site to `out/` because `next.config.ts` sets `output: "export"`.

On Vercel, import this repository, leave the framework preset as Next.js, and deploy. No environment variables are required. The published site is the static export.

## Daily refresh

[`.github/workflows/refresh.yml`](.github/workflows/refresh.yml) runs `npm run fetch` every day at 06:00 UTC, and when started by hand from the Actions tab. If `data/jobs.json` changed, the workflow commits and pushes that file to the default branch. Vercel then rebuilds the site from the new commit.

The workflow needs permission to push to the default branch. It does not run discovery again; careers pages change rarely, so run `npm run discover` yourself when the firm list changes.
