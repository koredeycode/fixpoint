// trace.js — the structured execution-trace event bus.
//
// Every boundary in the runtime (compile, model call, tool call, remote
// fetch-and-run, REST call, stream chunk, error, retry) emits a span here. The
// bus powers the live graph, the chronological log, and the JSON export
// ("HAR for agents"). It is platform glue (an intrinsic), not kernel logic.

let SEQ = 0;

// One bounded preview helper for every consumer: the public stream, the trace
// spans and the developer panel. The full value stays on the span as `result`.
export function preview(value, limit = 240) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export class TraceBus extends EventTarget {
  constructor({ updateBatchMs = 100 } = {}) {
    super();
    this.events = [];
    this.spans = new Map();
    this.updateBatchMs = updateBatchMs;
  }

  _cleanSpan(span) {
    const clean = { ...span };
    delete clean._flushTimer;
    delete clean._pendingStream;
    delete clean._pendingChunks;
    return clean;
  }

  _flushStream(id) {
    const span = this.spans.get(id);
    if (!span?._pendingStream) return;
    const streamChunk = span._pendingStream;
    const chunkCount = span._pendingChunks;
    span._pendingStream = "";
    span._pendingChunks = 0;
    if (span._flushTimer) {
      clearTimeout(span._flushTimer);
      span._flushTimer = null;
    }
    this._emit({ phase: "update", ...this._cleanSpan(span), streamChunk, chunkCount });
  }

  _emit(ev) {
    ev.seq = SEQ++;
    ev.t = performance.now();
    ev.wall = Date.now();
    this.events.push(ev);
    this.dispatchEvent(new CustomEvent("event", { detail: ev }));
  }

  // Open a span; returns an id used to close it.
  start(kind, fields = {}) {
    const id = `s${SEQ}`;
    const span = { id, kind, parent: fields.parent ?? null, status: "running", ...fields };
    span.startedAt = performance.now();
    this.spans.set(id, span);
    this._emit({ phase: "start", ...this._cleanSpan(span) });
    return id;
  }

  // Attach incremental info to a running span (e.g. a stream chunk).
  // Emits the full merged span so each event is self-contained for the UI.
  // Stream fragments are coalesced: one update per short window, not per token.
  update(id, fields = {}) {
    const span = this.spans.get(id);
    if (!span) return;
    Object.assign(span, fields);
    if (fields.streamChunk && this.updateBatchMs > 0) {
      span._pendingStream = (span._pendingStream || "") + fields.streamChunk;
      span._pendingChunks = (span._pendingChunks || 0) + 1;
      if (!span._flushTimer) {
        span._flushTimer = setTimeout(() => this._flushStream(id), this.updateBatchMs);
        span._flushTimer.unref?.();
      }
      return;
    }
    this._emit({ phase: "update", ...this._cleanSpan(span), ...fields });
  }

  end(id, fields = {}) {
    const span = this.spans.get(id);
    if (!span) return;
    this._flushStream(id);
    Object.assign(span, fields, { status: fields.status || "ok" });
    span.durationMs = performance.now() - (span.startedAt ?? performance.now());
    this._emit({ phase: "end", ...this._cleanSpan(span) });
  }

  fail(id, error) {
    this.end(id, { status: "error", error: String(error && error.message ? error.message : error) });
  }

  // A point-in-time event with no duration (e.g. progress, info).
  note(kind, fields = {}) {
    this._emit({ phase: "note", kind, ...fields });
  }

  export() {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      events: this.events,
    };
  }
}
