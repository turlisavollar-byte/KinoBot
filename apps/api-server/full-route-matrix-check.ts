import "reflect-metadata";
import dotenv from "dotenv";
import type { Server } from "node:http";

dotenv.config({ path: "../../.env" });

const port = 3470;
let server: Server | undefined;

console.log("ROUTE_MATRIX_START");
process.on("uncaughtException", (error) => {
  console.error("ROUTE_MATRIX_UNCAUGHT_EXCEPTION", error);
  process.exitCode = 1;
});
process.on("unhandledRejection", (error) => {
  console.error("ROUTE_MATRIX_UNHANDLED_REJECTION", error);
  process.exitCode = 1;
});

async function main() {
  const { default: app } = await import("./src/app.ts");
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(port, () => resolve(instance));
    instance.once("error", reject);
  });

  try {
    const loginEmail = process.env.CHECK_LOGIN_EMAIL;
    const loginPassword = process.env.CHECK_LOGIN_PASSWORD;
    if (!loginEmail || !loginPassword) {
      throw new Error(
        "Set CHECK_LOGIN_EMAIL and CHECK_LOGIN_PASSWORD before running the route matrix.",
      );
    }

    const loginRes = await fetch(
      `http://localhost:${port}/api/identity/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      },
    );

    const loginText = await loginRes.text();
    console.log("LOGIN_STATUS", loginRes.status);
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginText}`);
    }

    const login = JSON.parse(loginText);
    const token = login.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    const noAuthRes = await fetch(
      `http://localhost:${port}/api/analytics/overview?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.999Z`,
    );
    console.log("NOAUTH_ANALYTICS", noAuthRes.status);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 unauthenticated, got ${noAuthRes.status}`);
    }

    const checks = [
      ["IDENTITY_ME", "GET", "/api/identity/auth/me", headers],
      ["USERS", "GET", "/api/users", headers],
      ["ADMIN_USERS", "GET", "/api/admin-users", headers],
      [
        "ANALYTICS",
        "GET",
        "/api/analytics/overview?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.999Z",
        headers,
      ],
      ["FEATURE_FLAGS", "GET", "/api/feature-flags", headers],
      ["NOTIFICATIONS", "GET", "/api/notifications/templates", headers],
      ["TELEGRAM", "GET", "/api/telegram/config", headers],
      ["SUBSCRIPTIONS", "GET", "/api/subscriptions/plans", headers],
      ["BILLING", "GET", "/api/billing/payments?page=1&limit=5", headers],
      ["CATALOG_MOVIES", "GET", "/api/catalog/movies?page=1&limit=5", headers],
      ["CATALOG_SERIES", "GET", "/api/catalog/series?page=1&limit=5", headers],
      ["CATALOG_ACTORS", "GET", "/api/catalog/actors", headers],
      ["CATALOG_GENRES", "GET", "/api/catalog/genres", headers],
      ["VIDEO_CODES", "GET", "/api/video-codes", headers],
      ["SEARCH", "GET", "/api/search?q=movie", headers],
    ];

    for (const [name, method, url, requestHeaders] of checks) {
      const res = await fetch(`http://localhost:${port}${url}`, {
        method,
        headers: requestHeaders,
      });
      const text = await res.text();
      console.log(name, res.status);
      if (res.status >= 400 && res.status !== 403) {
        throw new Error(
          `${name} returned ${res.status}: ${text.slice(0, 200)}`,
        );
      }
    }

    console.log("ROUTE_MATRIX_OK");
  } catch (error) {
    console.error("ROUTE_MATRIX_ERROR", error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => (error ? reject(error) : resolve())),
      );
    }
    process.exit(process.exitCode ?? 0);
  }
}

main().catch((error) => {
  console.error("UNCAUGHT_CHECK_ERROR", error);
  process.exitCode = 1;
});
