import { readFileSync } from "fs";
import { join } from "path";
import { db } from "@workspace/db";

async function migrate() {
  const migrationPath = join(__dirname, "../drizzle/0011_rbac_enhancements.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  console.log("Running RBAC enhancements migration...");
  
  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await db.execute(statement);
      console.log("✓ Executed:", statement.substring(0, 50) + "...");
    } catch (error) {
      console.error("✗ Failed:", statement.substring(0, 50) + "...");
      console.error("Error:", error);
    }
  }

  console.log("RBAC enhancements migration completed!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
