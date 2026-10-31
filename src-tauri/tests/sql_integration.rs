//! Integration tests: the real migrations + the app's SQL, run against
//! in-memory SQLite — no app, no GUI. Keep the SQL statements here in sync
//! with `src/main.ts` (see docs/harness/TESTING.md, rule 3).

use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

/// Applies the app's migrations to a fresh in-memory SQLite, in ascending
/// order — mirroring what tauri-plugin-sql does at startup. A single pooled
/// connection keeps the in-memory database alive for the whole test.
async fn migrated_pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .min_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("connect in-memory sqlite");
    for m in stock_manager_lib::migrations() {
        sqlx::query(&m.sql)
            .execute(&pool)
            .await
            .unwrap_or_else(|e| panic!("migration {} ({}) failed: {e}", m.version, m.description));
    }
    pool
}

#[tokio::test]
async fn migrations_create_the_expected_schema() {
    let pool = migrated_pool().await;
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT name FROM pragma_table_info('items') ORDER BY cid")
            .fetch_all(&pool)
            .await
            .unwrap();
    // Compare as a set: ALTER TABLE ADD COLUMN appends columns at the end,
    // so physical order is an implementation detail, not a contract.
    let mut names: Vec<String> = rows.into_iter().map(|r| r.0).collect();
    names.sort();
    let mut expected = vec![
        "id".to_string(),
        "name".to_string(),
        "quantity".to_string(),
        "unit".to_string(),
        "notes".to_string(),
        "consumed_per_day".to_string(),
        "alert_threshold_days".to_string(),
        "last_stocked_at".to_string(),
        "last_alerted_at".to_string(),
        "created_at".to_string(),
        "updated_at".to_string(),
    ];
    expected.sort();
    assert_eq!(names, expected);
}

#[tokio::test]
async fn item_crud_roundtrip_with_parameterized_queries() {
    let pool = migrated_pool().await;
    let now = "2026-10-31T12:00:00.000Z";

    // INSERT — same statement as the app.
    sqlx::query(
        "INSERT INTO items (name, quantity, unit, notes, consumed_per_day, alert_threshold_days, created_at, updated_at, last_stocked_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)",
    )
    .bind("Rice")
    .bind(3.0)
    .bind("kg")
    .bind("")
    .bind(1.0)
    .bind(5.0)
    .bind(now)
    .execute(&pool)
    .await
    .unwrap();

    let (id, quantity): (i64, f64) =
        sqlx::query_as("SELECT id, quantity FROM items WHERE name = $1")
            .bind("Rice")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(quantity, 3.0);

    // UPDATE — quantity adjust is a stock event.
    sqlx::query(
        "UPDATE items SET quantity = $1, updated_at = $2, last_stocked_at = $3 WHERE id = $4",
    )
    .bind(5.0)
    .bind(now)
    .bind(now)
    .bind(id)
    .execute(&pool)
    .await
    .unwrap();
    let (quantity,): (f64,) = sqlx::query_as("SELECT quantity FROM items WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(quantity, 5.0);

    // DELETE
    sqlx::query("DELETE FROM items WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .unwrap();
    let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM items")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn negative_quantities_are_rejected_by_schema() {
    let pool = migrated_pool().await;
    let result = sqlx::query(
        "INSERT INTO items (name, quantity, unit, notes, consumed_per_day, alert_threshold_days, created_at, updated_at, last_stocked_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)",
    )
    .bind("Bad")
    .bind(-1.0)
    .bind("unit")
    .bind("")
    .bind(1.0)
    .bind(5.0)
    .bind("2026-10-31T12:00:00.000Z")
    .execute(&pool)
    .await;
    assert!(
        result.is_err(),
        "CHECK (quantity >= 0) must reject negative quantities"
    );
}

#[tokio::test]
async fn nullable_optional_fields_roundtrip() {
    let pool = migrated_pool().await;
    let now = "2026-10-31T12:00:00.000Z";
    sqlx::query(
        "INSERT INTO items (name, quantity, unit, notes, consumed_per_day, alert_threshold_days, created_at, updated_at, last_stocked_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)",
    )
    .bind("Plain")
    .bind(2.0)
    .bind("unit")
    .bind("")
    .bind(Option::<f64>::None)
    .bind(Option::<f64>::None)
    .bind(now)
    .execute(&pool)
    .await
    .unwrap();
    let (consumed, threshold): (Option<f64>, Option<f64>) =
        sqlx::query_as("SELECT consumed_per_day, alert_threshold_days FROM items WHERE name = $1")
            .bind("Plain")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(consumed, None);
    assert_eq!(threshold, None);
}
