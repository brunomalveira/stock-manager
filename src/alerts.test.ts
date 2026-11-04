import { describe, expect, test } from "vitest";
import { alertBody, RE_ALERT_INTERVAL_MS, shouldAlert } from "./alerts";

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Local times on purpose: the projection ticks at 23:59 local.
const stocked = new Date(2026, 9, 30, 8, 0).getTime(); // Oct 30, 08:00 local

const base = {
  name: "Rice",
  quantity: 3,
  unit: "kg",
  consumed_per_day: 1,
  alert_threshold_days: 5,
  last_stocked_at: new Date(stocked).toISOString(),
  created_at: new Date(stocked).toISOString(),
  last_alerted_at: null,
};

describe("shouldAlert", () => {
  test("fires on the first crossing", () => {
    expect(shouldAlert(base, stocked + 14 * HOUR)).toBe(true); // 3d to zero <= 5d threshold
  });

  test("stays quiet without a consumption rate", () => {
    expect(shouldAlert({ ...base, consumed_per_day: null }, stocked)).toBe(false);
  });

  test("stays quiet without a threshold", () => {
    expect(shouldAlert({ ...base, alert_threshold_days: null }, stocked)).toBe(false);
  });

  test("stays quiet above the threshold", () => {
    const item = { ...base, alert_threshold_days: 2 }; // 3d > 2d
    expect(shouldAlert(item, stocked + 14 * HOUR)).toBe(false);
  });

  test("re-alerts at most once per day", () => {
    const alerted = { ...base, last_alerted_at: new Date(stocked).toISOString() };
    expect(shouldAlert(alerted, stocked + 60_000)).toBe(false); // just alerted
    expect(shouldAlert(alerted, stocked + RE_ALERT_INTERVAL_MS)).toBe(true); // a day later
  });

  test("respects the daily interval after a re-stock", () => {
    // A stock event moves the projection back above the threshold...
    const restocked = {
      ...base,
      last_alerted_at: new Date(stocked).toISOString(),
      quantity: 10,
    };
    expect(shouldAlert(restocked, stocked + 6 * HOUR)).toBe(false); // 10d to zero > 5d
    // ...then the item is low again
    const low = { ...restocked, quantity: 3 };
    expect(shouldAlert(low, stocked + 6 * HOUR)).toBe(false); // still within the daily interval
    expect(shouldAlert(low, stocked + RE_ALERT_INTERVAL_MS)).toBe(true);
  });
});

describe("alertBody", () => {
  test("shows remaining and days to empty as whole numbers", () => {
    expect(alertBody(base, stocked + 14 * HOUR)).toBe("Rice: ≈ 3 kg left · ~3d to empty");
  });

  test("rounds fractional days", () => {
    const rice = { ...base, consumed_per_day: 2 }; // 1.5d to zero
    expect(alertBody(rice, stocked + 14 * HOUR)).toBe("Rice: ≈ 3 kg left · ~2d to empty");
  });

  test("reports ran out", () => {
    expect(alertBody(base, stocked + 4 * DAY)).toBe("Rice: ran out");
  });
});
