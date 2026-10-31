import Database from "@tauri-apps/plugin-sql";

interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const UNITS = ["unit", "kg", "g", "l", "ml", "box", "pack"];
const DB_URL = "sqlite:stockmanager.db";

let db: Database;
let items: Item[] = [];
let editingId: number | null = null;

const form = document.querySelector("#item-form") as HTMLFormElement;
const formTitle = document.querySelector("#form-title") as HTMLElement;
const nameInput = document.querySelector("#name") as HTMLInputElement;
const quantityInput = document.querySelector("#quantity") as HTMLInputElement;
const unitSelect = document.querySelector("#unit") as HTMLSelectElement;
const notesInput = document.querySelector("#notes") as HTMLInputElement;
const submitBtn = document.querySelector("#submit-btn") as HTMLButtonElement;
const cancelBtn = document.querySelector("#cancel-btn") as HTMLButtonElement;
const errorEl = document.querySelector("#error") as HTMLElement;
const itemsTable = document.querySelector("#items") as HTMLTableElement;
const tbody = document.querySelector("#items-body") as HTMLTableSectionElement;
const emptyEl = document.querySelector("#empty") as HTMLElement;

/** 2 -> "2", 2.5 -> "2.5" (trims trailing zeros; quantity is REAL for kg-style units). */
function fmtQuantity(q: number): string {
  return String(Number(q.toFixed(3)));
}

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

    const nameCell = document.createElement("td");
    nameCell.textContent = item.name;

    const qtyCell = document.createElement("td");
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
    qtyCell.append(minus, qty, plus);

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

    tr.append(nameCell, qtyCell, notesCell, actionsCell);
    tbody.append(tr);
  }
}

async function adjustQuantity(id: number, delta: number): Promise<void> {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const next = Math.max(0, item.quantity + delta); // quantities can never go negative
  if (next === item.quantity) return;
  await db.execute(
    "UPDATE items SET quantity = $1, updated_at = $2 WHERE id = $3",
    [next, new Date().toISOString(), id],
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

  if (!name) {
    showError("Name is required.");
    return;
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    showError("Quantity must be a number greater than or equal to 0.");
    return;
  }

  const now = new Date().toISOString();
  try {
    if (editingId === null) {
      await db.execute(
        "INSERT INTO items (name, quantity, unit, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)",
        [name, quantity, unit, notes, now],
      );
    } else {
      await db.execute(
        "UPDATE items SET name = $1, quantity = $2, unit = $3, notes = $4, updated_at = $5 WHERE id = $6",
        [name, quantity, unit, notes, now, editingId],
      );
      resetForm();
    }
    await refresh();
  } catch (e) {
    showError(`Database error: ${e instanceof Error ? e.message : String(e)}`);
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

  await refresh();
});
