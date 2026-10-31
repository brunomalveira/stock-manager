import { describe, expect, test } from "vitest";
import { parseCsv, toCsv } from "./csv";

const base = {
  name: "Rice",
  quantity: 3,
  unit: "kg",
  notes: "",
  consumed_per_day: 1,
  alert_threshold_days: 5,
};

const HEADER = "name,quantity,unit,notes,consumed_per_day,alert_threshold_days";

describe("toCsv", () => {
  test("writes the header and one row per item", () => {
    expect(toCsv([base])).toBe(`${HEADER}\nRice,3,kg,,1,5\n`);
  });

  test("wraps fields containing commas, quotes or newlines", () => {
    const csv = toCsv([{ ...base, name: 'Flour, "strong"', notes: "line1\nline2" }]);
    expect(csv).toContain('"Flour, ""strong"""');
    expect(csv).toContain('"line1\nline2"');
  });

  test("empty optionals stay empty", () => {
    const csv = toCsv([{ ...base, consumed_per_day: null, alert_threshold_days: null }]);
    expect(csv).toBe(`${HEADER}\nRice,3,kg,,,\n`);
  });
});

describe("parseCsv", () => {
  test("round-trips through toCsv", () => {
    const csv = toCsv([base, { ...base, name: "Flour, whole", notes: "keep, cold" }]);
    const { items, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(items).toHaveLength(2);
    expect(items[1]).toEqual({
      name: "Flour, whole",
      quantity: 3,
      unit: "kg",
      notes: "keep, cold",
      consumed_per_day: 1,
      alert_threshold_days: 5,
    });
  });

  test("handles CRLF and a trailing newline", () => {
    const { items, errors } = parseCsv(`${HEADER}\r\nRice,3,kg,,1,5\r\n`);
    expect(errors).toEqual([]);
    expect(items).toEqual([base]);
  });

  test("empty optional fields become null", () => {
    const { items } = parseCsv(`${HEADER}\nRice,3,kg,,,\n`);
    expect(items[0].consumed_per_day).toBeNull();
    expect(items[0].alert_threshold_days).toBeNull();
  });

  test("collects per-row errors instead of throwing", () => {
    const { items, errors } = parseCsv(
      `${HEADER}\nRice,abc,kg,,,\n,2,kg,,,\n`,
    );
    expect(items).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("quantity");
    expect(errors[1]).toContain("name");
  });

  test("rejects a wrong header", () => {
    const { items, errors } = parseCsv("a,b,c,d,e,f\n1,2,3,4,5,6\n");
    expect(items).toEqual([]);
    expect(errors[0]).toContain("Unexpected header");
  });
});
