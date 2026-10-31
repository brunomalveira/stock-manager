import Database from "@tauri-apps/plugin-sql";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { alertBody, shouldAlert } from "./alerts";
import {
  daysSinceStock,
  fmtDays,
  fmtQuantity,
  isAlerting,
  projection,
} from "./projection";

interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  consumed_per_day: number | null;
  alert_threshold_days: number | null;
  last_stocked_at: string | null;
  last_alerted_at: string | null;
  created_at: string;
  updated_at: string;
}

const UNITS = ["unit", "kg", "g", "l", "ml", "box", "pack"];
const DB_URL = "sqlite:stockmanager.db";

let db: Database;
let items: Item[] = [];
let editingId: number | null = null;
let notificationsAllowed = false;

const form = document.querySelector("#item-form") as HTMLFormElement;
const formTitle = document.querySelector("#form-title") as HTMLElement;
const nameInput = document.querySelector("#name") as HTMLInputElement;
const quantityInput = document.querySelector("#quantity") as HTMLInputElement;
const unitSelect = document.querySelector("#unit") as HTMLSelectElement;
const notesInput = document.querySelector("#notes") as HTMLInputElement;
const consumedInput = document.querySelector("#consumed-per-day") as HTMLInputElement;
const alertInput = document.querySelector("#alert-days") as HTMLInputElement;
const submitBtn = document.querySelector("#submit-btn") as HTMLButtonElement;
const cancelBtn = document.querySelector("#cancel-btn") as HTMLButtonElement;
const errorEl = document.querySelector("#error") as HTMLElement;
const itemsTable = document.querySelector("#items") as HTMLTableElement;
const tbody = document.querySelector("#items-body") as HTMLTableSectionElement;
const emptyEl = document.querySelector("#empty") as HTMLElement;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.hidden = false;
  console.error(message);
}

function clearError(): void {
  errorEl.hidden = true;
}

function resetForm(): void {
  editingId = null;
  form.reset();
  formTitle.textContent = "Add item";
  submitBtn.textContent = "Add item";
  cancelBtn.hidden = true;
}

function startEdit(item: Item): void {
  editingId = item.id;
  nameInput.value = item.name;
  quantityInput.value = String(item.quantity);
  unitSelect.value = UNITS.includes(item.unit) ? item.unit : "unit";
  notesInput.value = item.notes;
  consumedInput.value = item.consumed_per_day === null ? "" : String(item.consumed_per_day);
  alertInput.value = item.alert_threshold_days === null ? "" : String(item.alert_threshold_days);
  formTitle.textContent = "Edit item";
  submitBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  nameInput.focus();
}

async function refresh(): Promise<void> {
  items = await db.select<Item[]>(
    "SELECT * FROM items ORDER BY name COLLATE NOCASE",
  );
  emptyEl.hidden = items.length > 0;
  itemsTable.hidden = items.length === 0;
  render();
}

function render(): void {
  tbody.replaceChildren();
  for (const item of items) {
    const tr = document.createElement("tr");
    const p = projection(item);
    const alerting = p !== null && isAlerting(item, p);
    if (alerting) tr.className = "warn-row";

    const nameCell = document.createElement("td");
    nameCell.textContent = item.name;

    const qtyCell = document.createElement("td");
    const qtyLine = document.createElement("div");
    qtyLine.className = "qty-line";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.className = "qty-btn";
    minus.dataset.action = "adjust";
    minus.dataset.delta = "-1";
    minus.dataset.id = String(item.id);
    minus.setAttribute("aria-label", `Decrease ${item.name}`);
    const qty = document.createElement("span");
    qty.className = "qty";
    qty.textContent = `${fmtQuantity(item.quantity)} ${item.unit}`;
    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.className = "qty-btn";
    plus.dataset.action = "adjust";
    plus.dataset.delta = "1";
    plus.dataset.id = String(item.id);
    plus.setAttribute("aria-label", `Increase ${item.name}`);
    qtyLine.append(minus, qty, plus);
    const stocked = document.createElement("span");
    stocked.className = "secondary";
    stocked.textContent = `stocked ${fmtDays(daysSinceStock(item))}d ago`;
    qtyCell.append(qtyLine, stocked);

    const alarmCell = document.createElement("td");
    alarmCell.className = "alarm";
    if (p === null) {
      alarmCell.textContent = "—";
      alarmCell.classList.add("muted");
    } else if (p.remaining <= 0) {
      alarmCell.textContent = "ran out";
      if (alerting) alarmCell.classList.add("warn");
    } else {
      const text = `≈ ${fmtQuantity(p.remaining)} ${item.unit} left · ~${fmtDays(p.daysToZero)}d to empty`;
      alarmCell.textContent = alerting ? `⚠ ${text}` : text;
      if (alerting) alarmCell.classList.add("warn");
    }

    const notesCell = document.createElement("td");
    notesCell.textContent = item.notes;
    notesCell.className = "notes";

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.dataset.action = "edit";
    editBtn.dataset.id = String(item.id);
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = String(item.id);
    actionsCell.append(editBtn, deleteBtn);

    tr.append(nameCell, qtyCell, alarmCell, notesCell, actionsCell);
    tbody.append(tr);
  }
}

async function adjustQuantity(id: number, delta: number): Promise<void> {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const next = Math.max(0, item.quantity + delta); // quantities can never go negative
  if (next === item.quantity) return;
  const now = new Date().toISOString();
  // Any quantity change is a stock event: the projection baseline resets.
  await db.execute(
    "UPDATE items SET quantity = $1, updated_at = $2, last_stocked_at = $3 WHERE id = $4",
    [next, now, now, id],
  );
  await refresh();
}

async function removeItem(item: Item): Promise<void> {
  const confirmed = confirm(
    `Delete "${item.name}"? This cannot be undone.`,
  );
  if (!confirmed) return;
  await db.execute("DELETE FROM items WHERE id = $1", [item.id]);
  if (editingId === item.id) resetForm();
  await refresh();
}

async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault();
  clearError();
  const name = nameInput.value.trim();
  const quantity = Number(quantityInput.value);
  const unit = unitSelect.value;
  const notes = notesInput.value.trim();
  const consumedRaw = consumedInput.value.trim();
  const consumed = consumedRaw === "" ? null : Number(consumedRaw);
  const alertRaw = alertInput.value.trim();
  const alertDays = alertRaw === "" ? null : Number(alertRaw);

  if (!name) {
    showError("Name is required.");
    return;
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    showError("Quantity must be a number greater than or equal to 0.");
    return;
  }
  if (consumed !== null && (!Number.isFinite(consumed) || consumed < 0)) {
    showError("Consumed per day must be a number greater than or equal to 0.");
    return;
  }
  if (alertDays !== null && (!Number.isFinite(alertDays) || alertDays < 0)) {
    showError("Alert days must be a number greater than or equal to 0.");
    return;
  }

  const now = new Date().toISOString();
  try {
    if (editingId === null) {
      await db.execute(
        "INSERT INTO items (name, quantity, unit, notes, consumed_per_day, alert_threshold_days, created_at, updated_at, last_stocked_at, last_alerted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7, $8)",
        [name, quantity, unit, notes, consumed, alertDays, now, null],
      );
    } else {
      const previous = items.find((i) => i.id === editingId) ?? null;
      const quantityChanged = previous !== null && previous.quantity !== quantity;
      const lastStocked = quantityChanged
        ? now
        : (previous?.last_stocked_at ?? previous?.created_at ?? now);
      const lastAlerted = quantityChanged ? null : (previous?.last_alerted_at ?? null);
      await db.execute(
        "UPDATE items SET name = $1, quantity = $2, unit = $3, notes = $4, consumed_per_day = $5, alert_threshold_days = $6, updated_at = $7, last_stocked_at = $8, last_alerted_at = $9 WHERE id = $10",
        [name, quantity, unit, notes, consumed, alertDays, now, lastStocked, lastAlerted, editingId],
      );
      resetForm();
    }
    await refresh();
  } catch (e) {
    showError(`Database error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function ensurePermission(): Promise<void> {
  try {
    if (await isPermissionGranted()) {
      notificationsAllowed = true;
      return;
    }
    notificationsAllowed = (await requestPermission()) === "granted";
  } catch (e) {
    console.error(`Notification permission failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Fires the alarm notifications for items under threshold — at most once per item per day. */
async function checkAlarms(): Promise<void> {
  if (!notificationsAllowed) return;
  const now = Date.now();
  for (const item of items) {
    if (!shouldAlert(item, now)) continue;
    try {
      await sendNotification({ title: "Stock manager", body: alertBody(item, now) });
      const nowIso = new Date().toISOString();
      await db.execute(
        "UPDATE items SET last_alerted_at = $1 WHERE id = $2",
        [nowIso, item.id],
      );
      item.last_alerted_at = nowIso; // keep local state in sync with the DB
    } catch (e) {
      console.error(`Notification failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    db = await Database.load(DB_URL);
  } catch (e) {
    showError(`Failed to open database: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  for (const unit of UNITS) {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    unitSelect.append(option);
  }

  form.addEventListener("submit", (e) => void handleSubmit(e));
  cancelBtn.addEventListener("click", resetForm);

  tbody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLElement>("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (action === "adjust") {
      void adjustQuantity(id, Number(button.dataset.delta));
    } else if (action === "edit") {
      const item = items.find((i) => i.id === id);
      if (item) startEdit(item);
    } else if (action === "delete") {
      const item = items.find((i) => i.id === id);
      if (item) void removeItem(item);
    }
  });

  await ensurePermission();
  await refresh();
  // Keep "days since" and the projection fresh while the app sits open.
  setInterval(() => render(), 60_000);
  // Autonomy phase 1: alarm checks while the app runs (phase 2 adds a launchd agent).
  await checkAlarms();
  setInterval(() => void checkAlarms(), 5 * 60_000);
});
