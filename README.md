# MiCA Crypto Job Board

Static job board for **MiCA-licensed crypto firms**. Discovery maps each firm’s careers page to a known ATS (Greenhouse, Lever, Ashby, Workable, Personio). A daily GitHub Action fetches public job APIs into `data/jobs.json`; Next.js exports a filterable static site.

## Stack

- Node.js 20+ / TypeScript
- Next.js App Router with `output: 'export'`
- GitHub Actions cron for daily job refresh

## Data files

| File | Role |
|------|------|
| `data/firms.csv` | Source firms (`name`, `country`, `website`) |
| `data/companies.json` | ATS discovery output (`name`, `country`, `website`, `careersUrl`, `ats`, `slug`) |
| `data/jobs.json` | Normalized job postings |
| `data/fetch-log.json` | Optional per-run failure summary |

## Scripts

```bash
npm install

# Re-run ATS discovery for all firms in firms.csv (~372, concurrency 5).
# Writes data/companies.json. Slow; network-heavy. Not part of the daily Action.
npm run discover

# Fetch jobs for companies with a known ATS slug. Writes data/jobs.json.
# Safe to re-run; per-company failures are logged and skipped.
npm run fetch-jobs

# Local UI
npm run dev

# Static export → out/
npm run build
```

### Re-discover vs daily fetch

- **Discover** (`npm run discover`): crawl firm websites for careers URLs and ATS board slugs. Run when the firm list changes or you want to refresh ATS mapping. Commit the new `companies.json`.
- **Fetch** (`npm run fetch-jobs` / daily Action): only reads `companies.json` and hits public ATS endpoints. Does **not** re-discover. Cron: `0 6 * * *` plus `workflow_dispatch` in `.github/workflows/fetch-jobs.yml`.

## Normalized job shape

```ts
{
  company: string;
  licenceCountry: string;
  title: string;
  location: string;
  remote: boolean;
  department: string;
  url: string;
  postedAt: string | null;
}
```

## UI

- Search + filters: licence country, department, remote
- Separate **Careers pages** section for firms with `ats === "other"`

## License

MIT
