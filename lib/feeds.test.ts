import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGreenhouse, parseLever, parsePersonio, toJob } from "./feeds";
import type { Company } from "./types";

const company: Company = {
  name: "Acme",
  licenceCountry: "DE",
  website: "https://acme.example",
  careersUrl: null,
  ats: "greenhouse",
  slug: "acme",
  status: "ok",
};

describe("feed parsers", () => {
  it("normalises greenhouse and drops a US-only role", () => {
    const jobs = parseGreenhouse(
      JSON.stringify({
        jobs: [
          { id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/1", location: { name: "Berlin" }, updated_at: "2026-01-02T00:00:00.000Z" },
          { id: 2, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/2", location: { name: "New York" }, updated_at: "2026-01-02T00:00:00.000Z" },
        ],
      }),
    );
    const kept = jobs.map((job) => toJob(company, job, "2026-02-01T00:00:00.000Z")).filter(Boolean);
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.location, "Berlin");
    assert.equal(kept[0]?.department, "Engineering");
    assert.equal(kept[0]?.licenceCountry, "DE");
  });

  it("marks lever remote roles and parses personio xml", () => {
    const lever = parseLever(
      JSON.stringify([
        {
          id: "abc",
          text: "Compliance Counsel",
          categories: { location: "Remote" },
          hostedUrl: "https://jobs.lever.co/acme/abc",
          createdAt: 1767225600000,
          workplaceType: "remote",
        },
      ]),
    );
    const job = toJob({ ...company, ats: "lever", slug: "acme" }, lever[0]!, "2026-02-01T00:00:00.000Z");
    assert.equal(job?.remote, true);
    assert.equal(job?.department, "Compliance & Legal");

    const personio = parsePersonio(
      `<workzag-jobs><position><id>9</id><name><![CDATA[Finance Manager]]></name><office>Wien</office><createdAt>2026-03-01T00:00:00+00:00</createdAt></position></workzag-jobs>`,
      "acme",
    );
    assert.equal(personio[0]?.url, "https://acme.jobs.personio.de/job/9");
    assert.equal(personio[0]?.location, "Wien");
  });
});
