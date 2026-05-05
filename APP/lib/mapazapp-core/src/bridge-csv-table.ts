/**
 * Minimal CSV matrix parser (comma-separated, optional double-quote rules).
 * No file I/O.
 */

export function parseCsvTextToMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, ""); // BOM

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    if (row.length === 0 && cell === "") return;
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushCell();
    } else if (c === "\r") {
      if (s[i + 1] === "\n") i++;
      pushRow();
    } else if (c === "\n") {
      pushRow();
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    pushCell();
    rows.push(row);
  }

  return rows.filter(r => r.some(x => String(x).trim() !== ""));
}

export function buildHeaderIndex(headerRow: string[]): Map<string, number> {
  const m = new Map<string, number>();
  headerRow.forEach((h, i) => {
    const key = h.trim();
    if (!m.has(key)) m.set(key, i);
  });
  return m;
}
