// Run the LATEST upstream Open Agentic Web validator against this site.
//
// The official checks live in cognizant-ai-labs/agentic-web's agentify-website
// skill (README: `build_network.mjs --check` and `check_partner.mjs`). Vendoring
// a copy would silently go stale, so CI fetches the skill from the upstream
// default branch every time and runs that copy. No publisher-specific code is
// injected into the validator; it sees only our published artifacts.
//
// Usage: node tooling/scripts/check_spec.mjs [--partners]
//   --partners  also run check_partner.mjs against each allowed peer origin
//               (needs network access to the deployed peers).

import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REPO = process.cwd();
const ARCHIVE = "https://github.com/cognizant-ai-labs/agentic-web/archive/refs/heads/main.tar.gz";
const COMMIT = "https://api.github.com/repos/cognizant-ai-labs/agentic-web/commits/main";
const TIMEOUT_MS = 45_000;

async function get(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "fixpoint-spec-check" },
  });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response;
}

async function latestSkill() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "fixpoint-spec-"));
  try {
    const archive = await get(ARCHIVE);
    const file = path.join(tmp, "agentic-web.tar.gz");
    await writeFile(file, Buffer.from(await archive.arrayBuffer()));
    execFileSync("tar", ["-xzf", file, "-C", tmp], { stdio: "pipe" });
    const entries = await readdir(tmp, { withFileTypes: true });
    const root = entries.find((e) => e.isDirectory() && e.name.startsWith("agentic-web-"));
    const skill = root && path.join(tmp, root.name, "skills", "agentify-website");
    for (const required of ["scripts/build_network.mjs", "scripts/check_partner.mjs", "templates/network.hocon", "runtime/hocon.js", "runtime/kernel.js"]) {
      await readFile(path.join(skill, required));
    }
    let sha = "unknown";
    try {
      const info = await (await get(COMMIT)).json();
      sha = String(info.sha || "unknown").slice(0, 12);
    } catch { /* the archive itself is authoritative */ }
    return { tmp, skill, sha };
  } catch (error) {
    await rm(tmp, { recursive: true, force: true });
    throw error;
  }
}

async function assertPublishedFiles() {
  const required = [
    "public/agent-manifest.json",
    "public/fixpoint.network.json",
    "public/links.json",
  ];
  for (const file of required) {
    try {
      const text = await readFile(path.join(REPO, file), "utf8");
      if (!text.trim()) throw new Error("empty");
    } catch {
      throw new Error(`Missing published artifact: ${file}`);
    }
  }
}

async function main() {
  await assertPublishedFiles();
  const { tmp, skill, sha } = await latestSkill();
  try {
    console.log(`Upstream agentic-web @ ${sha}`);
    const buildArgs = [
      path.join(skill, "scripts", "build_network.mjs"),
      "fixpoint.hocon",
      "--manifest", "./public/agent-manifest.json",
      "--runtime", path.join(skill, "runtime"),
      "--out", "./public/fixpoint.network.json",
      "--check",
    ];
    console.log("+ node", buildArgs.join(" "));
    execFileSync(process.execPath, buildArgs, { cwd: REPO, stdio: "inherit" });

    if (process.argv.includes("--partners")) {
      const manifest = JSON.parse(await readFile(path.join(REPO, "public/agent-manifest.json"), "utf8"));
      for (const origin of manifest.allowed_peers || []) {
        const args = [
          path.join(skill, "scripts", "check_partner.mjs"),
          origin,
          "--origin", "https://askfixpoint.vercel.app",
        ];
        console.log("+ node", args.join(" "));
        execFileSync(process.execPath, args, { cwd: REPO, stdio: "inherit" });
      }
    }
    console.log("Latest upstream spec validation: OK");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`spec validation failed: ${error.message}`);
  process.exitCode = 1;
});
