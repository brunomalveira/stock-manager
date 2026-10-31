use tauri_plugin_sql::{Migration, MigrationKind};

/// Local SQLite database. The file lives in the OS app-data directory for
/// identifier `com.brunomalveira.stockmanager` (see AGENTS.md — never change
/// the identifier, it orphans the user's data).
const DB_URL: &str = "sqlite:stockmanager.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    DB_URL,
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
                    ],
                )
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
