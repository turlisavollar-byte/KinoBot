import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["build"], {
  stdio: "inherit",
  shell: isWindows,
  env: { ...process.env, NEXT_PUBLIC_SHOW_DEMO: "true" },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
