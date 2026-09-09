import "dotenv/config";
console.log("Starting api-server with:");
console.log("API_PORT=", process.env.API_PORT);
console.log(
  "DATABASE_URL=",
  process.env.DATABASE_URL
    ? process.env.DATABASE_URL.slice(0, 80) + "..."
    : "MISSING",
);
import("./dist/index.mjs");
