use tauri::menu::{ContextMenu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Local SQLite database. The file lives in the OS app-data directory for
/// identifier `com.brunomalveira.stockmanager` (see AGENTS.md — never change
/// the identifier, it orphans the user's data).
const DB_URL: &str = "sqlite:stockmanager.db";

/// The single source of truth for the schema. Applied migrations are
/// immutable — sqlx checksums their SQL text, so even re-indenting a
/// string breaks `Database.load()` (see AGENTS.md). Always add new
/// migrations; never touch applied ones.
///
/// `#[rustfmt::skip]` guards the multi-line SQL strings from reformats.
/// `src-tauri/tests/sql_integration.rs` applies this list against
/// in-memory SQLite to test the real schema.
#[rustfmt::skip]
pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_items",
            sql: "CREATE TABLE items (
                            id         INTEGER PRIMARY KEY AUTOINCREMENT,
                            name       TEXT NOT NULL,
                            quantity   REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
                            unit       TEXT NOT NULL DEFAULT 'unit',
                            notes      TEXT NOT NULL DEFAULT '',
                            created_at TEXT NOT NULL,
                            updated_at TEXT NOT NULL
                        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_consumed_per_day",
            sql: "ALTER TABLE items ADD COLUMN consumed_per_day REAL;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_alert_threshold_days",
            sql: "ALTER TABLE items ADD COLUMN alert_threshold_days REAL;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_last_stocked_at",
            sql: "ALTER TABLE items ADD COLUMN last_stocked_at TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "backfill_last_stocked_at",
            sql: "UPDATE items SET last_stocked_at = created_at WHERE last_stocked_at IS NULL;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_last_alerted_at",
            sql: "ALTER TABLE items ADD COLUMN last_alerted_at TEXT;",
            kind: MigrationKind::Up,
        },
    ]
}

/// Opens the native context menu for an item row (right-click).
#[tauri::command]
fn show_item_menu(app: tauri::AppHandle, id: i64, window: tauri::Window) -> Result<(), String> {
    let edit = MenuItemBuilder::with_id(format!("edit-{id}"), "Edit")
        .build(&app)
        .map_err(|e| e.to_string())?;
    let delete = MenuItemBuilder::with_id(format!("delete-{id}"), "Delete")
        .build(&app)
        .map_err(|e| e.to_string())?;
    let menu = MenuBuilder::new(&app)
        .item(&edit)
        .item(&delete)
        .build()
        .map_err(|e| e.to_string())?;
    menu.popup(window).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .menu(|app| {
            // App menu (macOS): About / Hide / Quit.
            let app_menu = SubmenuBuilder::new(app, "Stock Manager")
                .about(None)
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;
            // Standard Edit menu — makes copy/paste work in text fields.
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let add_item = MenuItemBuilder::with_id("add-item", "Add Item")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            MenuBuilder::new(app)
                .item(&app_menu)
                .item(&edit_menu)
                .item(&add_item)
                .build()
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.clone();
            if id == "add-item" {
                let _ = app.emit("menu://add-item", ());
            } else if let Some(rest) = id.strip_prefix("edit-") {
                if let Ok(item_id) = rest.parse::<i64>() {
                    let _ = app.emit(
                        "item-menu://action",
                        serde_json::json!({ "action": "edit", "id": item_id }),
                    );
                }
            } else if let Some(rest) = id.strip_prefix("delete-") {
                if let Ok(item_id) = rest.parse::<i64>() {
                    let _ = app.emit(
                        "item-menu://action",
                        serde_json::json!({ "action": "delete", "id": item_id }),
                    );
                }
            }
        })
        .invoke_handler(tauri::generate_handler![show_item_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
