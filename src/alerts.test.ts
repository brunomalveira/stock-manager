import { describe, expect, test } from "vitest";
import { alertBody, RE_ALERT_INTERVAL_MS, shouldAlert } from "./alerts";

const DAY = 86_400_000;
const T0 = Date.parse("2026-10-30T12:00:00.000Z");

const base = {
  name: "Rice",
  quantity: 3,
  unit: "kg",
  consumed_per_day: 1,
  alert_threshold_days: 5,
  last_stocked_at: "2026-10-30T12:00:00.000Z",
  created_at: "2026-10-30T12:00:00.000Z",
  last_alerted_at: null,
};

describe("shouldAlert", () => {
  test("fires on the first crossing", () => {
    expect(shouldAlert(base, T0)).toBe(true); // 3d to zero <= 5d threshold
  });

  test("stays quiet without a consumption rate", () => {
    expect(shouldAlert({ ...base, consumed_per_day: null }, T0)).toBe(false);
  });

  test("stays quiet without a threshold", () => {
    expect(shouldAlert({ ...base, alert_threshold_days: null }, T0)).toBe(false);
  });

  test("stays quiet above the threshold", () => {
    const item = { ...base, alert_threshold_days: 2 }; // 3d > 2d
    expect(shouldAlert(item, T0)).toBe(false);
  });

  test("re-alerts at most once per day", () => {
    const alerted = { ...base, last_alerted_at: new Date(T0).toISOString() };
    expect(shouldAlert(alerted, T0 + 1)).toBe(false); // just alerted
    expect(shouldAlert(alerted, T0 + RE_ALERT_INTERVAL_MS)).toBe(true); // a day later
  });

  test("respects the daily interval after a re-stock", () => {
    // stock event moves the projection back above the threshold...
    const restocked = {
      ...base,
      last_alerted_at: new Date(T0).toISOString(),
      quantity: 10,
    };
    expect(shouldAlert(restocked, T0 + DAY / 2)).toBe(false); // 9.5d to zero > 5d
    // ...then the quantity drops under the threshold again
    const low = { ...restocked, quantity: 3 };
    expect(shouldAlert(low, T0 + DAY / 2)).toBe(false); // still within the daily interval
    expect(shouldAlert(low, T0 + RE_ALERT_INTERVAL_MS)).toBe(true);
  });
});

describe("alertBody", () => {
  test("shows remaining and days to empty", () => {
    expect(alertBody(base, T0)).toBe("Rice: ≈ 3 kg left · ~3d to empty");
  });

  test("reports ran out", () => {
    expect(alertBody(base, T0 + 4 * DAY)).toBe("Rice: ran out");
  });
});
