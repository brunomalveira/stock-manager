/**
 * Pure stock-projection helpers — no DOM, no Tauri imports.
 * Keeping these exported and side-effect-free is what makes them
 * unit-testable with Vitest (see docs/harness/TESTING.md).
 */

export interface ProjectionInput {
  quantity: number;
  unit: string;
  consumed_per_day: number | null;
  alert_threshold_days: number | null;
  last_stocked_at: string | null;
  created_at: string;
}

export interface Projection {
  daysSince: number;
  remaining: number;
  daysToZero: number;
}

const DAY_MS = 86_400_000;
/** The projection day ticks over at 23:59 local time, not midnight. */
const TICK_MS = 60_000;

/** 2 -> "2", 2.4 -> "2", 2.5 -> "3" (stock is shown in whole units, rounded). */
export function fmtInt(q: number): string {
  return String(Math.round(q));
}

/**
 * The "unit" label pluralizes with the count ("1 unit", "3 units", and
 * "0 units", matching English); other unit labels (kg, l, box, …) are
 * count-neutral and stay as-is. The check uses the rounded display value.
 */
export function fmtUnit(unit: string, amount: number): string {
  if (unit !== "unit") return unit;
  return Math.round(amount) === 1 ? "unit" : "units";
}

/**
 * Whole days elapsed since the stock event, counted on the user's wall
 * clock: every 23:59 boundary adds one day, so the projection ticks down
 * once a day at 23:59 instead of continuously. (A DST shift can skew a
 * boundary by an hour; Brazil observes no DST.)
 */
export function wholeDaysSinceStock(item: ProjectionInput, now = Date.now()): number {
  const baseline = Date.parse(item.last_stocked_at ?? item.created_at);
  const dayIndex = (t: number): number => {
    const localMs = t - new Date(t).getTimezoneOffset() * 60_000;
    return Math.floor((localMs + TICK_MS) / DAY_MS);
  };
  return Math.max(0, dayIndex(now) - dayIndex(baseline));
}

/**
 * Consumption projection: remaining ≈ quantity − rate × whole days since
 * the stock event (days tick over at 23:59 local). NULL consumed_per_day
 * (or rate ≤ 0) = no projection.
 */
export function projection(item: ProjectionInput, now = Date.now()): Projection | null {
  const rate = item.consumed_per_day ?? 0;
  if (rate <= 0) return null;
  const daysSince = wholeDaysSinceStock(item, now);
  const remaining = item.quantity - rate * daysSince;
  return { daysSince, remaining, daysToZero: remaining / rate };
}

/** Alarm fires when the projection exists and days-to-zero is within the threshold. */
export function isAlerting(item: ProjectionInput, p: Projection): boolean {
  return item.alert_threshold_days !== null && p.daysToZero <= item.alert_threshold_days;
}
