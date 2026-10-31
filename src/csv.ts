/**
 * Pure CSV helpers for the portable export/import format — no DOM, no Tauri
 * imports. Unit-testable with Vitest (docs/harness/TESTING.md, layer 2).
 *
 * Format: RFC 4180-ish. Header row:
 * name,quantity,unit,notes,consumed_per_day,alert_threshold_days
 * Fields containing commas, quotes or newlines are wrapped in quotes and
 * embedded quotes are doubled.
 *
 * The portable set only: app-internal timestamps (last_stocked_at,
 * last_alerted_at, created_at, updated_at) are not part of the file. New
 * items get fresh timestamps on import (importing = re-stocking); existing
 * items keep their state (a re-import is idempotent).
 */

export interface CsvItem {
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  consumed_per_day: number | null;
  alert_threshold_days: number | null;
}

export const CSV_HEADER = [
  "name",
  "quantity",
  "unit",
  "notes",
  "consumed_per_day",
  "alert_threshold_days",
];

function fmtNum(n: number): string {
  return String(Number(n.toFixed(3)));
}

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(items: CsvItem[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const item of items) {
    lines.push(
      [
        escapeField(item.name),
        fmtNum(item.quantity),
        escapeField(item.unit),
        escapeField(item.notes),
        item.consumed_per_day === null ? "" : fmtNum(item.consumed_per_day),
        item.alert_threshold_days === null ? "" : fmtNum(item.alert_threshold_days),
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}

/** Splits CSV text into records (RFC 4180: quoted fields, doubled quotes, CRLF). */
function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const push = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    push();
    records.push(record);
    record = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      push();
    } else if (ch === "\n") {
      pushRecord();
    } else if (ch === "\r") {
      // CRLF: the \n ends the record; a lone \r is ignored.
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) pushRecord();
  return records;
}

/** Parses CSV text into items, collecting per-row errors instead of throwing. */
export function parseCsv(text: string): { items: CsvItem[]; errors: string[] } {
  const errors: string[] = [];
  const items: CsvItem[] = [];
  const records = parseRecords(text);
  if (records.length === 0) return { items, errors };

  const header = records[0].map((h) => h.trim().toLowerCase()).join(",");
  if (header !== CSV_HEADER.join(",")) {
    errors.push(`Unexpected header — expected "${CSV_HEADER.join(",")}".`);
    return { items, errors };
  }

  for (let r = 1; r < records.length; r++) {
    const rowNumber = r + 1;
    const fields = records[r];
    if (fields.length === 1 && fields[0].trim() === "") continue; // blank line
    if (fields.length !== CSV_HEADER.length) {
      errors.push(`Row ${rowNumber}: expected ${CSV_HEADER.length} columns, got ${fields.length}.`);
      continue;
    }
    const name = fields[0].trim();
    if (name === "") {
      errors.push(`Row ${rowNumber}: name is required.`);
      continue;
    }
    const quantity = Number(fields[1].trim());
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push(`Row ${rowNumber}: quantity must be a number ≥ 0.`);
      continue;
    }
    const unit = fields[2].trim() === "" ? "unit" : fields[2].trim();
    const notes = fields[3];
    const consumed = fields[4].trim() === "" ? null : Number(fields[4].trim());
    const threshold = fields[5].trim() === "" ? null : Number(fields[5].trim());
    if (consumed !== null && (!Number.isFinite(consumed) || consumed < 0)) {
      errors.push(`Row ${rowNumber}: consumed_per_day must be a number ≥ 0 or empty.`);
      continue;
    }
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
      errors.push(`Row ${rowNumber}: alert_threshold_days must be a number ≥ 0 or empty.`);
      continue;
    }
    items.push({
      name,
      quantity,
      unit,
      notes,
      consumed_per_day: consumed,
      alert_threshold_days: threshold,
    });
  }
  return { items, errors };
}
