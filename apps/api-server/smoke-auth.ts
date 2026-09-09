import "reflect-metadata";
import app from "./src/app.ts";

const port = 3456;
const server = app.listen(port, async () => {
  try {
    const loginRes = await fetch(
      `http://localhost:${port}/api/identity/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@stream.uz",
          password: "admin123",
        }),
      },
    );

    const loginText = await loginRes.text();
    console.log("LOGIN_STATUS", loginRes.status);
    console.log(loginText.slice(0, 500));

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginText}`);
    }

    const login = JSON.parse(loginText);

    const meRes = await fetch(`http://localhost:${port}/api/identity/auth/me`, {
      headers: { Authorization: `Bearer ${login.accessToken}` },
    });
    const meText = await meRes.text();
    console.log("ME_STATUS", meRes.status);
    console.log(meText.slice(0, 500));

    const usersRes = await fetch(`http://localhost:${port}/api/users`, {
      headers: { Authorization: `Bearer ${login.accessToken}` },
    });
    const usersText = await usersRes.text();
    console.log("USERS_STATUS", usersRes.status);
    console.log(usersText.slice(0, 500));

    server.close();
    process.exit(0);
  } catch (error) {
    console.error("SMOKE_ERROR", error);
    server.close();
    process.exit(1);
  }
});
