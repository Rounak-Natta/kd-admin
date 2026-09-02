import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

const mode = process.argv[2] === "dev" ? "dev" : "start";
const explicitPort = Number.parseInt(process.env.PORT ?? "", 10);
const preferredPort = Number.isFinite(explicitPort) && explicitPort > 0 ? explicitPort : 3001;
const maxFallbackPort = preferredPort + 9;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ port, host: "0.0.0.0", exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

let port = preferredPort;
if (!(await isPortAvailable(port))) {
  if (Number.isFinite(explicitPort) && explicitPort > 0) {
    console.error(`Port ${port} is already in use. PORT was explicitly configured, so Kitchen Diaries Admin will not choose another port.`);
    console.error(`Stop the process using port ${port}, or set PORT to a free port and run npm ${mode === "dev" ? "run dev" : "start"} again.`);
    process.exit(1);
  }

  let found = false;
  for (let candidate = preferredPort + 1; candidate <= maxFallbackPort; candidate += 1) {
    if (await isPortAvailable(candidate)) {
      port = candidate;
      found = true;
      break;
    }
  }

  if (!found) {
    console.error(`Ports ${preferredPort}-${maxFallbackPort} are already in use. Stop an old Node/Next process or set PORT to a free port.`);
    process.exit(1);
  }

  console.warn(`Port ${preferredPort} is already in use. Starting Kitchen Diaries Admin on http://localhost:${port} instead.`);
}

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, mode, "-p", String(port)], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
