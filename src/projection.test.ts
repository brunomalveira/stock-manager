import { describe, expect, test } from "vitest";
import {
  fmtInt,
  fmtUnit,
  isAlerting,
  projection,
  wholeDaysSinceStock,
} from "./projection";

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Local times on purpose: the projection ticks at 23:59 local, so the tests
// pin wall-clock moments instead of UTC instants.
const stocked = new Date(2026, 9, 30, 8, 0).getTime(); // Oct 30, 08:00 local

const base = {
  quantity: 3,
  unit: "kg",
  consumed_per_day: 1,
  alert_threshold_days: 5,
  last_stocked_at: new Date(stocked).toISOString(),
  created_at: new Date(stocked).toISOString(),
};

describe("fmtInt", () => {
  test("rounds to the nearest whole unit", () => {
    expect(fmtInt(2)).toBe("2");
    expect(fmtInt(2.4)).toBe("2");
    expect(fmtInt(2.5)).toBe("3");
    expect(fmtInt(-0.4)).toBe("0");
  });
});

describe("fmtUnit", () => {
  test("pluralizes the unit label when the count is not 1", () => {
    expect(fmtUnit("unit", 1)).toBe("unit");
    expect(fmtUnit("unit", 3)).toBe("units");
    expect(fmtUnit("unit", 0)).toBe("units");
    expect(fmtUnit("unit", 1.4)).toBe("unit"); // displays as "1"
  });

  test("leaves other unit labels unchanged", () => {
    expect(fmtUnit("kg", 1)).toBe("kg");
    expect(fmtUnit("kg", 3)).toBe("kg");
  });
});

describe("wholeDaysSinceStock", () => {
  test("is zero for the rest of the stock day", () => {
    expect(wholeDaysSinceStock(base, stocked + 14 * HOUR)).toBe(0); // 22:00
    expect(wholeDaysSinceStock(base, stocked + 15 * HOUR + 58 * 60_000)).toBe(0); // 23:58
  });

  test("ticks at 23:59 local, not at the stocking time", () => {
    expect(wholeDaysSinceStock(base, stocked + 15 * HOUR + 59 * 60_000)).toBe(1); // 23:59
  });

  test("counts one day per 23:59 boundary", () => {
    expect(wholeDaysSinceStock(base, stocked + DAY)).toBe(1); // next day, 08:00
    expect(wholeDaysSinceStock(base, stocked + DAY + 15 * HOUR + 58 * 60_000)).toBe(1); // next 23:58
    expect(wholeDaysSinceStock(base, stocked + DAY + 15 * HOUR + 59 * 60_000)).toBe(2); // next 23:59
  });

  test("falls back to created_at when last_stocked_at is null", () => {
    expect(wholeDaysSinceStock({ ...base, last_stocked_at: null }, stocked + DAY)).toBe(1);
  });

  test("clamps at zero for future timestamps", () => {
    expect(wholeDaysSinceStock(base, stocked - DAY)).toBe(0);
  });
});

describe("projection", () => {
  test("returns null without a consumption rate", () => {
    expect(projection({ ...base, consumed_per_day: null }, stocked)).toBeNull();
    expect(projection({ ...base, consumed_per_day: 0 }, stocked)).toBeNull();
  });

  test("is full stock until 23:59 of the stock day", () => {
    const p = projection(base, stocked + 14 * HOUR)!;
    expect(p.daysSince).toBe(0);
    expect(p.remaining).toBe(3);
    expect(p.daysToZero).toBe(3);
  });

  test("depletes by rate × whole days", () => {
    const p = projection(base, stocked + DAY)!;
    expect(p.remaining).toBe(2);
    expect(p.daysToZero).toBe(2);
  });

  test("goes negative once the projection runs out", () => {
    const p = projection(base, stocked + 4 * DAY)!;
    expect(p.remaining).toBe(-1);
    expect(p.daysToZero).toBe(-1);
  });

  test("uses the last stock event, not creation", () => {
    const item = { ...base, created_at: new Date(stocked - 10 * DAY).toISOString() };
    const p = projection(item, stocked)!;
    expect(p.daysSince).toBe(0);
  });
});

describe("isAlerting", () => {
  test("fires when days-to-zero is within the threshold", () => {
    const p = projection(base, stocked + 14 * HOUR)!; // 3d to zero, threshold 5
    expect(isAlerting(base, p)).toBe(true);
  });

  test("does not fire above the threshold", () => {
    const item = { ...base, alert_threshold_days: 2 }; // 3d > 2d
    const p = projection(item, stocked + 14 * HOUR)!;
    expect(isAlerting(item, p)).toBe(false);
  });

  test("never fires without a threshold", () => {
    const p = projection(base, stocked + 14 * HOUR)!;
    expect(isAlerting({ ...base, alert_threshold_days: null }, p)).toBe(false);
  });
});
