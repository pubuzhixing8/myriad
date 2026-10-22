import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const customUis = [
  { name: "Button UI", directory: "web/button", resource: "button", port: 3101 },
  {
    name: "Background UI",
    directory: "web/background",
    resource: "background-editor",
    port: 3102,
  },
  {
    name: "Dynamic Content UI",
    directory: "web/dynamic-content",
    resource: "dynamic-content",
    port: 3103,
  },
  { name: "Cards UI", directory: "web/cards", resource: "card-grid", port: 3104 },
  { name: "Embed HTML UI", directory: "web/html", resource: "embed-html", port: 3105 },
  { name: "Embed UI", directory: "web/embed", resource: "embed", port: 3106 },
  { name: "Tabs UI", directory: "web/tabs", resource: "tabs-editor", port: 3107 },
];

const configPath = fileURLToPath(new URL("../nexus.json", import.meta.url));
let config;

try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  console.error(`无法读取本地 Nexus 配置：${configPath}`);
  console.error(error);
  process.exit(1);
}

config.serve ??= {};
config.serve.resources ??= {};

for (const { resource, port } of customUis) {
  config.serve.resources[resource] = { port };
}

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

const services = [
  ...customUis.map(({ name, directory, port }) => ({
    name,
    args: ["run", "dev", "--prefix", directory, "--", "--port", String(port), "--strictPort"],
  })),
  { name: "Nexus tunnel", args: ["run", "debug:nexus"] },
];

const children = [];
let stopping = false;

function stop(signal = "SIGINT") {
  if (stopping) {
    return;
  }

  stopping = true;

  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) {
      continue;
    }

    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") {
        console.error(error);
      }
    }
  }
}

for (const { name, args } of services) {
  const child = spawn("npm", args, {
    stdio: "inherit",
    detached: true,
  });

  children.push(child);

  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error);
    stop();
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (stopping) {
      return;
    }

    console.error(`${name} stopped (${signal ?? code}). Stopping local debug.`);
    stop();
    process.exitCode = code || 1;
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
