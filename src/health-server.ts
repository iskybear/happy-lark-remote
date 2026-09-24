import { createServer } from 'node:http';
import { chmodSync, unlinkSync } from 'node:fs';
import path from 'node:path';

/** Served by the bridge event loop; probes existing Pi transports without prompting. */
export async function startHealthServer(configDir: string, probe: () => Promise<number>) {
  const socketPath = path.join(configDir, `health-${process.pid}.sock`);
  try {
    unlinkSync(socketPath);
  } catch {
    /* stale socket from a crashed bridge */
  }
  let pending: Promise<number> | undefined;
  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' || req.url !== '/health') {
      res.writeHead(404).end();
      return;
    }
    try {
      pending ??= probe().finally(() => {
        pending = undefined;
      });
      const clients = await pending;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'healthy', pid: process.pid, piClients: clients }));
    } catch {
      res.writeHead(503).end(JSON.stringify({ status: 'unhealthy', pid: process.pid }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, () => {
      chmodSync(socketPath, 0o600);
      resolve();
    });
  });
  server.unref();
  return server;
}
