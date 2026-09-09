import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const environment = { ...process.env };

if (existsSync(resolve(root, ".env"))) {
  const envContent = readFileSync(resolve(root, ".env"), "utf8");

  for (const line of envContent.split(/\r?\n/)) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const match = line.match(/^\s*([^#=]+)=(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (environment[key] !== undefined) continue;
    environment[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
} else {
  console.warn(".env file not found at:", resolve(root, ".env"));
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => {
      resolve(false);
    });
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "0.0.0.0");
  });
}

async function findAvailablePort(preferred) {
  let port = Number(preferred);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    port = 3000;
  }
  while (port <= 65535) {
    if (await isPortAvailable(port)) return port;
    port += 1;
  }
  throw new Error("No available ports found.");
}

const preferredApiPort = environment.API_PORT ?? environment.PORT ?? "8080";
const preferredDashboardPort = environment.DASHBOARD_PORT ?? "3000";
const apiPort = await findAvailablePort(preferredApiPort);
if (`${apiPort}` !== `${preferredApiPort}`) {
  console.warn(
    `API port ${preferredApiPort} is busy, using ${apiPort} instead.`,
  );
}
environment.API_PORT = String(apiPort);

const dashboardPort = await findAvailablePort(preferredDashboardPort);
if (`${dashboardPort}` !== `${preferredDashboardPort}`) {
  console.warn(
    `Dashboard port ${preferredDashboardPort} is busy, using ${dashboardPort} instead.`,
  );
}
environment.DASHBOARD_PORT = String(dashboardPort);

const build = spawnSync(
  process.execPath,
  [resolve(root, "apps/api-server/build.mjs")],
  {
    cwd: root,
    env: environment,
    stdio: "inherit",
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const services = [
  {
    name: "api-server",
    command: process.execPath,
    args: [resolve(root, "apps/api-server/dist/index.mjs")],
    env: {
      ...environment,
      PORT: environment.API_PORT ?? "8080",
      API_PORT: environment.API_PORT ?? "8080",
      DASHBOARD_PORT: environment.DASHBOARD_PORT ?? "3000",
    },
  },
  {
    name: "dashboard",
    command: resolve(root, "apps/dashboard/node_modules/.bin/vite.cmd"),
    args: [
      "--config",
      resolve(root, "apps/dashboard/vite.config.ts"),
      "--host",
      "0.0.0.0",
    ],
    env: {
      ...environment,
      PORT: environment.DASHBOARD_PORT ?? "3000",
      API_PORT: environment.API_PORT ?? "8080",
      DASHBOARD_PORT: environment.DASHBOARD_PORT ?? "3000",
    },
  },
];

const children = services.map(({ name, command, args, env }) => {
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${name} exited with ${signal ?? `code ${code}`}`);
    shutdown(code ?? 1);
  });
  return child;
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
