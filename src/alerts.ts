/**
 * Pure alert-decision helpers — no DOM, no Tauri imports.
 * Unit-testable with Vitest (docs/harness/TESTING.md, layer 2).
 */
import { fmtDays, fmtQuantity, projection, type ProjectionInput } from "./projection";

/** At most one alert per item per day — re-alert only if still under threshold. */
export const RE_ALERT_INTERVAL_MS = 86_400_000;

export interface AlertInput extends ProjectionInput {
  name: string;
  last_alerted_at: string | null;
}

export function shouldAlert(item: AlertInput, now = Date.now()): boolean {
  const p = projection(item, now);
  if (p === null) return false; // no consumption rate → no alarm
  if (item.alert_threshold_days === null) return false; // no threshold → alarm off
  if (p.daysToZero > item.alert_threshold_days) return false; // not close enough to zero
  if (item.last_alerted_at === null) return true; // first crossing
  return now - Date.parse(item.last_alerted_at) >= RE_ALERT_INTERVAL_MS;
}

/** Notification body for an item under threshold. */
export function alertBody(item: AlertInput, now = Date.now()): string {
  const p = projection(item, now)!;
  if (p.remaining <= 0) return `${item.name}: ran out`;
  return `${item.name}: ≈ ${fmtQuantity(p.remaining)} ${item.unit} left · ~${fmtDays(p.daysToZero)}d to empty`;
}
