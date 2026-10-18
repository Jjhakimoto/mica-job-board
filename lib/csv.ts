export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  if (!header) return [];

  return body.map((cells) =>
    Object.fromEntries(header.map((key, index) => [key.trim(), (cells[index] ?? "").trim()])),
  );
}

export function readFirm(row: Record<string, string>): {
  name: string;
  licenceCountry: string;
  website: string | null;
} | null {
  const name = row.name?.trim() ?? "";
  const licenceCountry = (row.licence_country || row.country || row.licenceCountry || "").trim();
  const rawWebsite = (row.website || "").trim();
  if (!name) return null;
  return {
    name,
    licenceCountry,
    website: normalizeWebsite(rawWebsite),
  };
}

export function normalizeWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || /^n\/?a$/i.test(trimmed)) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
