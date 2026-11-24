// Verify that every configured peer origin publishes the exact network name
// this site calls. A wrong deployment (e.g. the main site served from a peer
// origin) makes resolveRemote() fail closed at runtime, so catch it in CI.
//
// Usage: node tooling/scripts/check_peers.mjs

import { readFile } from "node:fs/promises";
import path from "node:path";

const REPO = process.cwd();
const TIMEOUT_MS = 15_000;

async function readJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json();
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(REPO, "public/agent-manifest.json"), "utf8"));
  const peers = manifest.allowed_peers || [];
  if (!peers.length) throw new Error("No allowed_peers configured.");
  let failures = 0;
  for (const origin of peers) {
    const url = `${origin.replace(/\/$/, "")}/agent-manifest.json`;
    try {
      const published = await readJson(url);
      const names = (published.networks || []).map((n) => n.name);
      const expected = origin.includes("localpros") ? "localpros"
        : origin.includes("spareparts") ? "spareparts" : null;
      const entry = (published.networks || []).find((n) => n.name === expected);
      const ok = expected ? Boolean(entry) : names.length > 0;
      let detail = names.join(", ") || "(none)";
      if (ok && entry?.hocon) {
        const network = await readJson(new URL(entry.hocon, `${origin.replace(/\/$/, "")}/`).href);
        const agentNames = (network.tools || []).map((t) => t.name);
        if (!agentNames.includes(entry.front_man)) {
          throw new Error(`${entry.front_man} is missing from ${entry.hocon}`);
        }
        detail += ` (${agentNames.join(", ")})`;
      }
      console.log(`${ok ? "OK  " : "FAIL"} ${origin} -> ${detail}`);
      if (!ok) failures += 1;
    } catch (error) {
      console.log(`FAIL ${origin} -> ${error.message}`);
      failures += 1;
    }
  }
  if (failures) throw new Error(`${failures} peer origin(s) do not publish the expected network.`);
  console.log(`All ${peers.length} peer origins publish their networks.`);
}

main().catch((error) => {
  console.error(`peer check failed: ${error.message}`);
  process.exitCode = 1;
});
