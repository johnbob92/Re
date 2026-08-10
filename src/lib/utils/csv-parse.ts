export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((v) => v.length)) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((v) => v.length)) rows.push(row);
  return rows;
}

export function rowsToObjects(rows: string[][]) {
  if (!rows.length) return [] as Record<string, string>[];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = cols[idx] || "";
    });
    return obj;
  });
}
