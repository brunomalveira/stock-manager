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

/** 2 -> "2", 2.5 -> "2.5" (trims trailing zeros; quantity is REAL for kg-style units). */
export function fmtQuantity(q: number): string {
  return String(Number(q.toFixed(3)));
}

/** 3.25 days -> "3.3" (one decimal is enough for day-scale figures). */
export function fmtDays(d: number): string {
  return String(Number(d.toFixed(1)));
}

/** Days elapsed since the current stock amount was set (stock event). */
export function daysSinceStock(item: ProjectionInput, now = Date.now()): number {
  const baseline = item.last_stocked_at ?? item.created_at;
  return Math.max(0, (now - Date.parse(baseline)) / DAY_MS);
}

/**
 * Consumption projection: remaining ≈ quantity − rate × days since the
 * stock event. NULL consumed_per_day (or rate ≤ 0) = no projection.
 */
export function projection(item: ProjectionInput, now = Date.now()): Projection | null {
  const rate = item.consumed_per_day ?? 0;
  if (rate <= 0) return null;
  const daysSince = daysSinceStock(item, now);
  const remaining = item.quantity - rate * daysSince;
  return { daysSince, remaining, daysToZero: remaining / rate };
}

/** Alarm fires when the projection exists and days-to-zero is within the threshold. */
export function isAlerting(item: ProjectionInput, p: Projection): boolean {
  return item.alert_threshold_days !== null && p.daysToZero <= item.alert_threshold_days;
}
