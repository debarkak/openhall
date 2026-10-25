import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(projectRoot, ".env"));
  }
} catch {
  // .env file not present or already provided via environment
}

async function stageBuildDirectory(name) {
  const source = path.join(projectRoot, name);
  const destination = path.join(standaloneRoot, name);

  try {
    await access(source);
  } catch {
    return;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

await stageBuildDirectory(".next/static");
await stageBuildDirectory("public");

const server = spawn(process.execPath, [path.join(standaloneRoot, "server.js")], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  console.error("failed to start the standalone server:", error);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
