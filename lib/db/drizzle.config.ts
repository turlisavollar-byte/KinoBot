import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

config({
  path: resolve(process.cwd(), "../../.env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined. Check the root .env file.");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
