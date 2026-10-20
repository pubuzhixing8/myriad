import { spawn } from "node:child_process";

const services = [
  ["Background UI", "dev:background"],
  ["Nexus tunnel", "debug:nexus"],
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

for (const [name, script] of services) {
  const child = spawn("npm", ["run", script], {
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
