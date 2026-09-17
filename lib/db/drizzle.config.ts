import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

config({
  path: resolve(process.cwd(), "../../.env"),
});

const databaseUrl =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined. Check the root .env file.");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle-canonical",
  dialect: "postgresql",
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: false,
});
