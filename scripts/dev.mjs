import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import net from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env file using dotenv for proper parsing
config({ path: resolve(root, ".env") });

const environment = { ...process.env };

async function validateDatabaseHost() {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env before starting development.",
    );
  }

  let host;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error(
      "DATABASE_URL is invalid. Use a PostgreSQL URL such as postgresql://user:password@host:5432/database.",
    );
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await lookup(host);
      return;
    } catch {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw new Error(
    `DATABASE_URL host "${host}" cannot be resolved. If this is a Supabase db.* host, use the IPv4 Session Pooler URL from Supabase Connect; otherwise update .env with a reachable database endpoint or start the local PostgreSQL service before running pnpm run dev.`,
  );
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

async function waitForHttpReady(
  url,
  timeoutMs = 45000,
  exitCheck = () => false,
) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (exitCheck()) {
      throw new Error(`Process exited before ${url} became ready.`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the server is genuinely ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url} to become ready.`);
}

async function cleanupStaleProjectProcesses() {
  if (process.platform !== "win32") return;

  const ports = [
    8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 3000, 3001,
    3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010,
  ];

  try {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        [
          "$ports = @(" + ports.join(", ") + ")",
          "$pids = Get-NetTCPConnection | Where-Object { $_.LocalPort -in $ports -and $_.State -eq 'Listen' } | Select-Object -ExpandProperty OwningProcess -Unique",
          "if ($pids) { $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } ; $pids -join ',' } else { '' }",
        ].join("; "),
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const output = result.stdout?.toString().trim();
    if (output) {
      console.log(`Stopped stale dev processes: ${output}`);
    }
  } catch {
    // Ignore cleanup errors; startup should continue if ports are free.
  }
}

await validateDatabaseHost();
await cleanupStaleProjectProcesses();

const preferredApiPort = environment.API_PORT ?? environment.PORT ?? "8080";
const preferredDashboardPort = environment.DASHBOARD_PORT ?? "3000";
const preferredWebPort = environment.WEB_PORT ?? "3001";
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

const webPort = await findAvailablePort(preferredWebPort);
if (`${webPort}` !== `${preferredWebPort}`) {
  console.warn(
    `Web port ${preferredWebPort} is busy, using ${webPort} instead.`,
  );
}
environment.WEB_PORT = String(webPort);

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
  {
    name: "web",
    command: resolve(root, "apps/web/node_modules/.bin/next.cmd"),
    args: ["dev", "-p", String(webPort)],
    cwd: resolve(root, "apps/web"),
    env: {
      ...environment,
      PORT: String(webPort),
      WEB_PORT: String(webPort),
      API_PORT: environment.API_PORT ?? "8080",
      DASHBOARD_PORT: environment.DASHBOARD_PORT ?? "3000",
    },
  },
];

let shuttingDown = false;

const children = [];
const apiState = { exited: false, code: null, signal: null };

// Start API server normally (non-detached)
const apiService = services.find((s) => s.name === "api-server");
if (apiService) {
  console.log(`Starting ${apiService.name}...`);

  const apiChild = spawn(apiService.command, apiService.args, {
    cwd: root,
    env: { ...process.env, ...apiService.env },
    stdio: "inherit",
  });
  children.push(apiChild);
  apiChild.on("spawn", () => {
    console.log(`${apiService.name} started (pid ${apiChild.pid})`);
  });
  apiChild.on("exit", (code, signal) => {
    apiState.exited = true;
    apiState.code = code;
    apiState.signal = signal;
    if (shuttingDown) return;
    console.error(`${apiService.name} exited with ${signal ?? `code ${code}`}`);
    shutdown(code ?? 1);
  });

  await waitForHttpReady(
    `http://127.0.0.1:${apiPort}/api/health`,
    45_000,
    () => apiState.exited,
  );
}

// Start dashboard only after the API health endpoint becomes ready.
const dashboardService = services.find((s) => s.name === "dashboard");
if (dashboardService) {
  const dashboardChild = spawn(
    dashboardService.command,
    dashboardService.args,
    {
      cwd: root,
      env: { ...process.env, ...dashboardService.env },
      stdio: "inherit",
      shell:
        process.platform === "win32" &&
        dashboardService.command.endsWith(".cmd"),
    },
  );
  children.push(dashboardChild);
  dashboardChild.on("spawn", () => {
    console.log(`${dashboardService.name} started (pid ${dashboardChild.pid})`);
  });
  dashboardChild.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `${dashboardService.name} exited with ${signal ?? `code ${code}`}`,
    );
    shutdown(code ?? 1);
  });
}

const webService = services.find((s) => s.name === "web");
if (webService) {
  const webChild = spawn(webService.command, webService.args, {
    cwd: webService.cwd,
    env: { ...process.env, ...webService.env },
    stdio: "inherit",
    shell: process.platform === "win32" && webService.command.endsWith(".cmd"),
  });
  children.push(webChild);
  webChild.on("spawn", () => {
    console.log(`${webService.name} started (pid ${webChild.pid})`);
  });
  webChild.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${webService.name} exited with ${signal ?? `code ${code}`}`);
    shutdown(code ?? 1);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

// Keep the orchestrator process alive while child services run
setInterval(() => {
  // Keep the process alive
}, 60_000);

process.stdin.resume();
