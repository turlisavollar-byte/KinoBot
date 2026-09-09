import app from "./src/app.ts";

const port = 3470;
let server: ReturnType<typeof app.listen> | undefined;

async function main() {
  server = app.listen(port, async () => {
    try {
      const loginEmail =
        process.env.CHECK_LOGIN_EMAIL || "superadmin@stream.uz";
      const loginPassword =
        process.env.CHECK_LOGIN_PASSWORD || "SuperAdmin123!";

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
        `http://localhost:${port}/api/analytics/overview?startDate=2026-01-01&endDate=2026-01-31`,
      );
      console.log("NOAUTH_ANALYTICS", noAuthRes.status);
      if (noAuthRes.status !== 401) {
        throw new Error(
          `Expected 401 unauthenticated, got ${noAuthRes.status}`,
        );
      }

      const checks = [
        ["IDENTITY_ME", "GET", "/api/identity/auth/me", headers],
        ["USERS", "GET", "/api/users", headers],
        [
          "ANALYTICS",
          "GET",
          "/api/analytics/overview?startDate=2026-01-01&endDate=2026-01-31",
          headers,
        ],
        ["FEATURE_FLAGS", "GET", "/api/feature-flags", headers],
        ["NOTIFICATIONS", "GET", "/api/notifications/templates", headers],
        ["TELEGRAM", "GET", "/api/telegram/config", headers],
        ["SUBSCRIPTIONS", "GET", "/api/subscriptions/plans", headers],
        ["BILLING", "GET", "/api/billing/payments?page=1&limit=5", headers],
        [
          "CATALOG_MOVIES",
          "GET",
          "/api/catalog/movies?page=1&limit=5",
          headers,
        ],
        [
          "CATALOG_SERIES",
          "GET",
          "/api/catalog/series?page=1&limit=5",
          headers,
        ],
        ["VIDEO_CODES", "GET", "/api/video-codes?page=1&limit=5", headers],
        ["SEARCH", "GET", "/api/search?q=movie", headers],
      ];

      for (const [name, method, url, requestHeaders] of checks) {
        const res = await fetch(`http://localhost:${port}${url}`, {
          method,
          headers: requestHeaders,
        });
        const text = await res.text();
        console.log(name, res.status);
        if (res.status >= 400) {
          throw new Error(
            `${name} returned ${res.status}: ${text.slice(0, 200)}`,
          );
        }
      }

      console.log("ROUTE_MATRIX_OK");
      process.exit(0);
    } catch (error) {
      console.error("ROUTE_MATRIX_ERROR", error);
      process.exit(1);
    } finally {
      server?.close();
    }
  });
}

main().catch((error) => {
  console.error("UNCAUGHT_CHECK_ERROR", error);
  process.exit(1);
});
