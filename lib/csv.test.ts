import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCsv, readFirm } from "./csv";

describe("parseCsv", () => {
  it("keeps quoted commas and escaped quotes", () => {
    const rows = parseCsv(
      'name,legal_name,licence_country,website\nBackpack EU,"""Trek Technologies"" SIA",LV,https://eu.backpack.exchange\n',
    );
    assert.equal(rows[0]?.legal_name, '"Trek Technologies" SIA');
    assert.deepEqual(readFirm(rows[0] ?? {}), {
      name: "Backpack EU",
      licenceCountry: "LV",
      website: "https://eu.backpack.exchange",
    });
  });

  it("drops empty websites", () => {
    const firm = readFirm({ name: "Altlift s.r.o.", licence_country: "CZ", website: "" });
    assert.equal(firm?.website, null);
  });
});
