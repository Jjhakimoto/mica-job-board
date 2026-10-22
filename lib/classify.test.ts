import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyDepartment, keepJob, postedWithin } from "./classify";

describe("classifyDepartment", () => {
  it("uses the first matching keyword group", () => {
    assert.equal(classifyDepartment("MLRO, Financial Crime"), "Compliance & Legal");
    assert.equal(classifyDepartment("Senior Data Engineer"), "Data");
    assert.equal(classifyDepartment("Product Engineer"), "Engineering");
    assert.equal(classifyDepartment("Product Manager"), "Product");
    assert.equal(classifyDepartment("Content Manager"), "Content");
    assert.equal(classifyDepartment("Senior Copywriter"), "Content");
    assert.equal(classifyDepartment("Growth Lead"), "Marketing & Growth");
    assert.equal(classifyDepartment("Business Development Manager"), "Sales & BD");
    assert.equal(classifyDepartment("Financial Controller"), "Finance");
    assert.equal(classifyDepartment("People Partner"), "Operations");
    assert.equal(classifyDepartment("Office Coordinator"), "Other");
  });
});

describe("postedWithin", () => {
  it("keeps roles posted inside the window and drops unknown dates", () => {
    const now = Date.parse("2026-10-22T18:00:00.000Z");
    assert.equal(postedWithin("2026-10-22T08:00:00.000Z", 1, now), true);
    assert.equal(postedWithin("2026-10-10T18:00:00.000Z", 7, now), false);
    assert.equal(postedWithin("2026-10-10T18:00:00.000Z", 30, now), true);
    assert.equal(postedWithin(null, 7, now), false);
  });
});

describe("keepJob", () => {
  it("keeps EU locations and EU-eligible remote roles", () => {
    assert.equal(keepJob("Engineer", "Berlin, Germany").keep, true);
    assert.equal(keepJob("Engineer", "Paris").keep, true);
    assert.equal(keepJob("Engineer", "Remote").keep, true);
    assert.equal(keepJob("Engineer", "Remote").remote, true);
    assert.equal(keepJob("EU Remote Engineer", "Anywhere").keep, true);
    assert.equal(keepJob("Support", "Dublin", true).remote, true);
  });

  it("drops US-only, UK-only, and APAC-only roles", () => {
    assert.equal(keepJob("Engineer", "New York, United States").keep, false);
    assert.equal(keepJob("Engineer", "Remote - United States").keep, false);
    assert.equal(keepJob("Engineer", "London").keep, false);
    assert.equal(keepJob("Engineer", "United Kingdom, London", true).keep, false);
    assert.equal(keepJob("Engineer", "Singapore").keep, false);
    assert.equal(keepJob("Engineer", "Remote, APAC").keep, false);
    assert.equal(keepJob("Engineer", "Brazil", true).keep, false);
    assert.equal(keepJob("Support", "Europe, Kyiv, Podil, Ukraine").keep, false);
    assert.equal(keepJob("Engineer", "Bangkok, TH, remote").keep, false);
    assert.equal(keepJob("Engineer", "London / EU").keep, true);
    assert.equal(keepJob("Engineer", "Limassol").keep, true);
    assert.equal(keepJob("Engineer", "Europe").keep, true);
  });
});
