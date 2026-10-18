import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { careerCandidates, detectAts, extractLinks, linkedInJobsUrl } from "./ats";

describe("detectAts", () => {
  it("reads greenhouse board slugs and embed tokens", () => {
    assert.deepEqual(
      detectAts('<a href="https://boards.greenhouse.io/acme/jobs/1">Jobs</a>'),
      { ats: "greenhouse", slug: "acme", url: "https://boards.greenhouse.io/acme" },
    );
    const embed = detectAts(
      '<script src="https://boards.greenhouse.io/embed/job_board?for=bitstamp"></script>',
    );
    assert.equal(embed?.ats, "greenhouse");
    assert.equal(embed?.slug, "bitstamp");
  });

  it("reads the other public board hosts", () => {
    assert.equal(detectAts("https://jobs.lever.co/coinbase")?.slug, "coinbase");
    assert.equal(detectAts("https://jobs.ashbyhq.com/linear")?.ats, "ashby");
    assert.equal(detectAts("https://apply.workable.com/n26")?.slug, "n26");
    assert.equal(detectAts("https://acme.jobs.personio.de/xml")?.slug, "acme");
    assert.equal(detectAts("https://acme.teamtailor.com/jobs")?.ats, "teamtailor");
    assert.equal(detectAts("https://acme.recruitee.com/")?.slug, "acme");
    assert.equal(detectAts("https://jobs.smartrecruiters.com/Visa/123")?.slug, "Visa");
  });

  it("reads slugs from escaped JSON", () => {
    assert.equal(detectAts('{"url":"https:\\/\\/jobs.lever.co\\/kraken"}')?.slug, "kraken");
  });

  it("ignores job-level workable links", () => {
    assert.equal(detectAts("https://apply.workable.com/j/ABCDEF"), null);
  });
});

describe("career links", () => {
  it("prefers a same-site careers path and falls back to linkedin", () => {
    const html = `
      <a href="/about">About</a>
      <a href="https://example.com/careers">Careers</a>
      <a href="https://www.linkedin.com/company/example-co">LinkedIn</a>
    `;
    const links = extractLinks(html, "https://example.com");
    assert.deepEqual(careerCandidates(links, new URL("https://example.com")), ["https://example.com/careers"]);
    assert.equal(linkedInJobsUrl(links), "https://www.linkedin.com/company/example-co/jobs");
  });
});
