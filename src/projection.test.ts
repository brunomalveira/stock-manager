import { describe, expect, test } from "vitest";
import {
  daysSinceStock,
  fmtDays,
  fmtQuantity,
  isAlerting,
  projection,
} from "./projection";

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-30T12:00:00.000Z");

const base = {
  quantity: 3,
  unit: "kg",
  consumed_per_day: 1,
  alert_threshold_days: 5,
  last_stocked_at: "2026-10-30T12:00:00.000Z",
  created_at: "2026-10-30T12:00:00.000Z",
};

describe("fmtQuantity", () => {
  test("trims trailing zeros", () => {
    expect(fmtQuantity(2)).toBe("2");
    expect(fmtQuantity(2.5)).toBe("2.5");
    expect(fmtQuantity(2.75)).toBe("2.75");
  });
});

describe("fmtDays", () => {
  test("keeps one decimal", () => {
    expect(fmtDays(3)).toBe("3");
    expect(fmtDays(3.25)).toBe("3.3");
  });
});

describe("daysSinceStock", () => {
  test("counts days since the stock event", () => {
    expect(daysSinceStock(base, T0 + 2 * DAY)).toBeCloseTo(2);
  });

  test("falls back to created_at when last_stocked_at is null", () => {
    expect(daysSinceStock({ ...base, last_stocked_at: null }, T0 + 2 * DAY)).toBeCloseTo(2);
  });

  test("clamps at zero for future timestamps", () => {
    expect(daysSinceStock(base, T0 - DAY)).toBe(0);
  });
});

describe("projection", () => {
  test("returns null without a consumption rate", () => {
    expect(projection({ ...base, consumed_per_day: null }, T0)).toBeNull();
    expect(projection({ ...base, consumed_per_day: 0 }, T0)).toBeNull();
  });

  test("is full stock on the stock day", () => {
    const p = projection(base, T0)!;
    expect(p.daysSince).toBe(0);
    expect(p.remaining).toBe(3);
    expect(p.daysToZero).toBe(3);
  });

  test("depletes by rate × days", () => {
    const p = projection(base, T0 + DAY)!;
    expect(p.remaining).toBeCloseTo(2);
    expect(p.daysToZero).toBeCloseTo(2);
  });

  test("goes negative once the projection runs out", () => {
    const p = projection(base, T0 + 4 * DAY)!;
    expect(p.remaining).toBeCloseTo(-1);
    expect(p.daysToZero).toBeCloseTo(-1);
  });

  test("uses the last stock event, not creation", () => {
    const item = { ...base, created_at: "2026-10-20T12:00:00.000Z" };
    const p = projection(item, T0)!;
    expect(p.daysSince).toBe(0);
  });
});

describe("isAlerting", () => {
  test("fires when days-to-zero is within the threshold", () => {
    const p = projection(base, T0)!; // 3d to zero, threshold 5
    expect(isAlerting(base, p)).toBe(true);
  });

  test("does not fire above the threshold", () => {
    const item = { ...base, alert_threshold_days: 2 }; // 3d > 2d
    const p = projection(item, T0)!;
    expect(isAlerting(item, p)).toBe(false);
  });

  test("never fires without a threshold", () => {
    const p = projection(base, T0)!;
    expect(isAlerting({ ...base, alert_threshold_days: null }, p)).toBe(false);
  });
});
