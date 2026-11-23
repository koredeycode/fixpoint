// remote.js — the RemoteNetworkLoader intrinsic: fetch a peer origin's published
// agent network (manifest + HOCON + coded-tool bundle) and make it runnable
// locally. This is the "fetch-and-run-locally" cross-origin composition model:
// there is no agent server — the caller's browser runs the peer's published files.

const DEFAULT_FETCH_TIMEOUT_MS = 8000;

/** Classify a peer-fetch failure. Never turns a failure into a business result. */
export function classifyFetchError(error, response) {
  if (error?.kind) return error.kind;
  if (error?.name === "AbortError") return "timeout";
  if (response && !response.ok) return "http_error";
  const message = String(error?.message || error || "");
  if (/cors|cross-origin|access-control/i.test(message)) return "cors_blocked";
  if (/abort|timeout|timed out/i.test(message)) return "timeout";
  if (/empty|unexpected end of json|no body/i.test(message)) return "empty_reply";
  return "network_unreachable";
}

function tagFetchError(error, kind, url) {
  const target = error instanceof Error ? error : new Error(String(error));
  target.kind = kind;
  target.rawMessage = String(error?.message || error);
  target.url = url;
  return target;
}

export async function fetchManifest(originUrl, { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = {}) {
  const base = originUrl.replace(/\/$/, "");
  const url = `${base}/agent-manifest.json`;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      throw tagFetchError(new Error(`manifest fetch ${resp.status} for ${url}`), "http_error", url);
    }
    let manifest;
    try {
      manifest = await resp.json();
    } catch (err) {
      throw tagFetchError(err, "empty_reply", url);
    }
    if (!manifest || !Array.isArray(manifest.networks) || !manifest.networks.length) {
      throw tagFetchError(new Error(`empty manifest for ${url}`), "empty_reply", url);
    }
    return { manifest, base, url };
  } catch (err) {
    const kind = timedOut ? "timeout" : classifyFetchError(err);
    if (!err?.kind) tagFetchError(err, kind, url);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url, { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      throw tagFetchError(new Error(`fetch ${resp.status} for ${url}`), "http_error", url);
    }
    const text = await resp.text();
    if (!text) throw tagFetchError(new Error(`empty reply for ${url}`), "empty_reply", url);
    return text;
  } catch (err) {
    const kind = timedOut ? "timeout" : classifyFetchError(err);
    if (!err?.kind) tagFetchError(err, kind, url);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Resolve a relative path against an origin base.
export function resolveUrl(base, path) {
  if (/^https?:\/\//i.test(path)) return path;
  return base.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path);
}

// Caches compiled peer sessions and enforces cycle + depth limits across hops.
export class RemoteRegistry {
  constructor({ maxDepth = 5, trace } = {}) {
    this.maxDepth = maxDepth;
    this.trace = trace;
    this.cache = new Map(); // key: `${origin}::${agentName}` -> Session
  }

  cacheKey(origin, agentName) {
    return `${origin}::${agentName}`;
  }

  get(origin, agentName) {
    return this.cache.get(this.cacheKey(origin, agentName));
  }

  set(origin, agentName, session) {
    this.cache.set(this.cacheKey(origin, agentName), session);
  }

  checkCycle(chain, origin, agentName) {
    const key = this.cacheKey(origin, agentName);
    if (chain.includes(key)) {
      const error = new Error(`composition cycle detected: ${[...chain, key].join(" -> ")}`);
      error.code = "COMPOSITION_CYCLE";
      throw error;
    }
    if (chain.length >= this.maxDepth) {
      const error = new Error(`composition depth limit (${this.maxDepth}) exceeded`);
      error.code = "COMPOSITION_DEPTH";
      throw error;
    }
  }
}
