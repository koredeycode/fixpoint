// Regression tests for the defects recorded in docs/trace-baseline.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BAD_CARD,
  GROUNDED_CARD,
  DUPLICATE_WIDGETS,
  TOOL_RESULTS,
  GARBLED_STREAM,
  TRUNCATED_PREVIEW,
} from "./fixtures/trace-defects.mjs";
import {
  createFactLedger,
  addToolResultToLedger,
  validatePresentationGrounding,
} from "../public/runtime/grounding.js";
import {
  normalizePresentation,
  consolidateIntakePresentations,
  agentPresentationContext,
} from "../public/runtime/cruse.js";
import { createDeltaBuffer } from "../public/runtime/llm.js";
import { TraceBus, preview } from "../public/runtime/trace.js";
import { executeToolCalls, dispatchToolCall } from "../public/runtime/runner.js";
import { ActionRegistry } from "../public/runtime/actions.js";
import { historyForModel, boundHistory } from "../public/runtime/engine.js";
import { installObservability } from "../public/observability.js";

function groundedLedger({ withParts = true } = {}) {
  const ledger = createFactLedger();
  addToolResultToLedger(ledger, TOOL_RESULTS.manualIndex);
  addToolResultToLedger(ledger, TOOL_RESULTS.symptomTree);
  addToolResultToLedger(ledger, TOOL_RESULTS.kit);
  if (withParts) addToolResultToLedger(ledger, TOOL_RESULTS.parts);
  return ledger;
}

// --- Phase 1: grounding of presentation cards -------------------------------

test("rejects the fabricated card from trace seq 564 (part, price, standard, fake quote)", () => {
  const result = validatePresentationGrounding(BAD_CARD, groundedLedger({ withParts: false }), {
    conversationText: "Which fault codes indicate a heating element failure? No, it's stuck",
    prose: "no tool ever returned a price for the belt; it is not a quote",
  });
  assert.equal(result.rejected, 1);
  assert.equal(result.presentation.components.length, 1);
  assert.equal(result.presentation.components[0].id, "wx200_next");
  const issues = result.issues.join(" ").toLowerCase();
  assert.ok(issues.includes("$18.00"));
  assert.ok(issues.includes("$12.00"));
  assert.ok(issues.includes("tahu-probe"));
  assert.ok(issues.includes("conversation"));
});

test("keeps a grounded table and manual section", () => {
  const result = validatePresentationGrounding(GROUNDED_CARD, groundedLedger());
  assert.equal(result.issues.length, 0);
  assert.equal(result.presentation.components.length, 2);
});

test("drops a card that contradicts prose saying no price or no part", () => {
  const result = validatePresentationGrounding(GROUNDED_CARD, groundedLedger(), {
    prose: "There is no price and no part id for this outcome.",
  });
  assert.equal(result.presentation.components.length, 1);
  assert.equal(result.presentation.components[0].id, "wx200_grounded_section");
  assert.equal(result.issues.length, 1);
});

test("render_cruse refuses a wholly unsupported payload", async () => {
  const trace = new TraceBus();
  const span = trace.start("tool");
  const ctx = {
    trace,
    displayOrigin: "x.test",
    presentationOutput: { presentation: null },
    factLedger: createFactLedger(),
    conversationText: "",
  };
  await assert.rejects(
    () =>
      dispatchToolCall(
        ctx,
        { kind: "presentation" },
        { presentation: { version: 1, components: [BAD_CARD.components[0]] } },
        span,
        [],
      ),
    /Presentation rejected/,
  );
});

// --- Phase 3: duplicate widgets and repeated reads ---------------------------

test("normalizePresentation merges near-duplicate choices with the same id and values", () => {
  const result = normalizePresentation(DUPLICATE_WIDGETS, "test");
  assert.equal(result.presentation.components.length, 1);
  assert.deepEqual(result.deduplicated, ["q1_drum_turns"]);
});

test("consolidateIntakePresentations also collapses duplicate questions", () => {
  const result = consolidateIntakePresentations([DUPLICATE_WIDGETS]);
  assert.equal(result.components.length, 1);
});

test("child presentation context no longer instructs the parent to re-author facts", () => {
  const network = { config: { cruse: {} }, getAgentSpec: () => ({ instructions: "agent" }) };
  const text = agentPresentationContext({ network, isTop: true, frontMan: "desk" }, "desk");
  assert.match(text, /Child presentations are DATA/);
  assert.doesNotMatch(text, /consolidate them into your own presentation/);
  assert.match(text, /Do not add part ids, prices/);
});

test("identical read-only website tool calls run once per invocation", async () => {
  let executions = 0;
  const registry = new ActionRegistry();
  const ref = registry.register(
    { base: "https://site.test", network: "test" },
    {
      name: "get_kit",
      description: "read kit",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => {
        executions += 1;
        return JSON.stringify({ ok: true, version: 0 });
      },
    },
  );
  const trace = new TraceBus();
  const parent = trace.start("run");
  const ctx = {
    trace,
    displayOrigin: "site.test",
    actions: registry,
    baseOrigin: "https://site.test",
    manifest: { actions: { agentTools: ["get_kit"] } },
    network: { name: "test" },
    isTop: true,
    slyData: {},
    toolResultCache: new Map(),
    toolCacheEpoch: 0,
    factLedger: createFactLedger(),
    conversationText: "",
  };
  const entry = { kind: "website", ref };
  const calls = [
    { id: "a", name: "website_get_kit", args: {}, entry },
    { id: "b", name: "website_get_kit", args: {}, entry },
  ];
  const results = await executeToolCalls(ctx, calls, parent, []);
  assert.equal(executions, 1);
  assert.equal(results.length, 2);
  assert.equal(results[0].content, results[1].content);
  assert.ok(trace.events.some((e) => e.kind === "tool_deduped"));
});

// --- Phase 4: streaming buffer, trace batching, garbled text -----------------

test("delta buffer coalesces single-character fragments into readable chunks", () => {
  const out = [];
  const buffer = createDeltaBuffer((text) => out.push(text), { size: 1000, timeoutMs: 1000 });
  for (const chunk of GARBLED_STREAM) buffer.push(chunk);
  buffer.flush();
  assert.equal(out.length, 1);
  assert.equal(out[0], GARBLED_STREAM.join(""));
  buffer.dispose();
});

test("delta buffer flushes on a sentence boundary", () => {
  const out = [];
  const buffer = createDeltaBuffer((text) => out.push(text), { size: 1000, timeoutMs: 1000 });
  buffer.push("Done.");
  buffer.push(" Next.");
  buffer.flush();
  assert.deepEqual(out, ["Done.", " Next."]);
  buffer.dispose();
});

test("trace batches stream updates and flushes before end", () => {
  const bus = new TraceBus({ updateBatchMs: 1000 });
  const id = bus.start("model_call");
  bus.update(id, { streamChunk: "a" });
  bus.update(id, { streamChunk: "b" });
  bus.update(id, { streamChunk: "c" });
  bus.end(id);
  const exported = bus.export();
  const updates = exported.events.filter((e) => e.phase === "update" && e.kind === "model_call");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].streamChunk, "abc");
  assert.equal(updates[0].chunkCount, 3);
  assert.ok(exported.events.every((e) => !("_pendingStream" in e) && !("_flushTimer" in e)));
});

// --- Phase 5: trace observability --------------------------------------------

test("preview is bounded and marks truncation", () => {
  assert.equal(preview("short", 10), "short");
  assert.equal(preview("abcdefghijk", 5), "abcd…");
});

test("tool spans keep the full result while the public preview stays short", () => {
  const bus = new TraceBus();
  const span = bus.start("tool");
  bus.end(span, { resultPreview: preview(TRUNCATED_PREVIEW, 240), result: TRUNCATED_PREVIEW });
  const end = bus.export().events.find((e) => e.phase === "end");
  assert.equal(end.result, TRUNCATED_PREVIEW);
  assert.ok(end.resultPreview.length <= 240);
});

test("observability rows expose resultPreview and resultBytes", () => {
  const bus = new TraceBus();
  const api = installObservability({ trace: bus });
  const span = bus.start("tool");
  bus.end(span, {
    tool: "website_get_kit",
    result: TRUNCATED_PREVIEW,
    resultPreview: preview(TRUNCATED_PREVIEW, 240),
  });
  const row = api.events().at(-1);
  assert.equal(row.resultBytes, TRUNCATED_PREVIEW.length);
  assert.ok(row.resultPreview.length <= 240);
});

// --- Phase 6: bounded context -------------------------------------------------

test("historyForModel sends widget ids instead of serialized card JSON", () => {
  const model = historyForModel([
    { role: "user", content: "hi" },
    {
      role: "assistant",
      content: "answer",
      presentation: { version: 1, components: [{ id: "a", kind: "info" }] },
    },
  ]);
  assert.equal(model[1].content, "answer\n[Widgets previously attached: a]");
  assert.doesNotMatch(JSON.stringify(model), /cruse-ui/);
});

test("boundHistory trims old turns but keeps the latest pair", () => {
  const history = Array.from({ length: 12 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: "x".repeat(900),
  }));
  const bounded = boundHistory(history, 2000);
  assert.ok(bounded.length < 12);
  assert.equal(bounded.at(-1).content, "x".repeat(900));
});
