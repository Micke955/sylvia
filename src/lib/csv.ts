export function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null) => {
    if (value === null || typeof value === "undefined") return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
  ];
  return lines.join("\n");
}

type CsvRow = Record<string, string>;

export function parseCsv(input: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      current.push(value);
      if (current.some((cell) => cell.trim() !== "")) {
        rows.push(current);
      }
      current = [];
      value = "";
      continue;
    }
    value += char;
  }
  if (value.length || current.length) {
    current.push(value);
    if (current.some((cell) => cell.trim() !== "")) {
      rows.push(current);
    }
  }
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  const result: CsvRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const record: CsvRow = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    result.push(record);
  }
  return result;
}
