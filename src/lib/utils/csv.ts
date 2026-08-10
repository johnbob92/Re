export type CsvValue = string | number | boolean | null | undefined | Date;

function escapeCell(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const raw =
    value instanceof Date ? value.toISOString() : typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv(headers: string[], rows: CsvValue[][]) {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  return lines.join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const csv = toCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
