// Observability bridge for Fixpoint.
//
// The runtime already emits a rich structured trace through TraceBus. This module
// subscribes to it, keeps a redacted ring buffer, and exposes a small console/UI
// API. It never edits runtime/ and never stores a key or a full prompt.

const MAX_EVENTS = 500;
const SECRET =
  /(otk_[A-Za-z0-9_-]+|otk_v1_eu_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._-]+)/gi;

const state = {
  engine: null,
  events: [],
  counts: Object.create(null),
  startedAt: Date.now(),
};

function redact(value) {
  if (typeof value === "string") return value.replace(SECRET, "[REDACTED]");
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = redact(item);
    return out;
  }
  return value;
}

function shorten(value, length = 200) {
  if (typeof value !== "string") return value;
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function onTraceEvent(event) {
  const detail = event.detail || {};
  const row = {
    seq: detail.seq,
    phase: detail.phase,
    kind: detail.kind || "unknown",
    status: detail.status,
    durationMs: detail.durationMs,
    origin: detail.origin || detail.peerOrigin,
    tool: detail.tool || detail.name || detail.action,
    note: shorten(detail.note),
    error: detail.error ? shorten(String(detail.error)) : undefined,
    at: detail.wall || Date.now(),
  };
  state.events.push(redact(row));
  if (state.events.length > MAX_EVENTS) state.events.shift();
  state.counts[row.kind] = (state.counts[row.kind] || 0) + 1;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fixpoint:obs", { detail: { ...row } }));
  }
}

function summary() {
  const events = state.events;
  const spans = events.filter((e) => e.phase === "end" && typeof e.durationMs === "number");
  const toolSpans = events.filter(
    (e) => e.phase === "end" && e.kind === "tool" && typeof e.durationMs === "number",
  );
  const average = (list) =>
    list.length ? Math.round(list.reduce((sum, e) => sum + e.durationMs, 0) / list.length) : 0;
  return {
    turns: state.counts.run || 0,
    toolCalls: state.counts.tool || 0,
    peerCalls: (state.counts.remote_call || 0) + (state.counts.remote_fetch || 0),
    consentDecisions: state.counts.consent || 0,
    errors: events.filter((e) => e.status === "error" || e.error).length,
    avgToolMs: average(toolSpans),
    avgSpanMs: average(spans),
    lastAt: events.length ? events[events.length - 1].at : null,
    uptimeMs: Date.now() - state.startedAt,
  };
}

/** Wire the bridge into a booted engine. Safe to call more than once. */
export function installObservability(engine) {
  if (state.engine) return window.__FIXPOINT_OBS__;
  state.engine = engine;
  engine.trace.addEventListener("event", onTraceEvent);

  const api = {
    events: () => state.events.slice(),
    summary,
    note: (kind, fields = {}) => engine.trace.note(kind, redact(fields)),
    clear: () => {
      state.events.length = 0;
      state.counts = Object.create(null);
      state.startedAt = Date.now();
    },
    export: () => ({
      version: 1,
      generatedAt: new Date().toISOString(),
      summary: summary(),
      events: state.events,
    }),
    /** The runtime's own full trace, including fields our redacted buffer drops. */
    rawTrace: () => engine.trace.export(),
  };

  if (typeof window !== "undefined") window.__FIXPOINT_OBS__ = api;
  return api;
}
