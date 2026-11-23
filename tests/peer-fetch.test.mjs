// Phase 3B: failed peer lookups must fail closed, never become business facts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFetchError, fetchManifest } from "../public/runtime/remote.js";
import { App } from "../public/store.js";

const realFetch = globalThis.fetch;
const PEER = "https://peer.example/agents/provider";

function withFetch(fn) {
  globalThis.fetch = fn;
  return () => {
    globalThis.fetch = realFetch;
  };
}

test("classifies errors and preserves the raw message and attempted URL", async () => {
  const restore = withFetch(async () => ({ ok: false, status: 503 }));
  try {
    await assert.rejects(fetchManifest(PEER), (error) => {
      assert.equal(error.kind, "http_error");
      assert.match(error.rawMessage, /manifest fetch 503/);
      assert.equal(error.url, `${PEER}/agent-manifest.json`);
      return true;
    });
  } finally {
    restore();
  }
});

test("classifies CORS and unreachable network failures separately", () => {
  assert.equal(
    classifyFetchError(new TypeError("CORS blocked: no Access-Control-Allow-Origin")),
    "cors_blocked",
  );
  assert.equal(classifyFetchError(new TypeError("Failed to fetch")), "network_unreachable");
});

test("a hanging peer manifest times out and aborts cleanly", async () => {
  const restore = withFetch(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  );
  const started = Date.now();
  try {
    await assert.rejects(fetchManifest(PEER, { timeoutMs: 20 }), (error) => {
      assert.equal(error.kind, "timeout");
      return true;
    });
    assert.ok(Date.now() - started < 1000, "timeout must abort promptly");
  } finally {
    restore();
  }
});

test("a failed peer lookup never invents a slot, price, receipt or booking", () => {
  App.page.resetState();
  App.page.addPartToKit("belt_42", 1);
  const before = App.page.getKit();
  const result = App.page.bookRepair({
    slotId: "slot_that_the_failed_peer_never_returned",
    expectedVersion: before.version,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /no longer available/i);
  assert.deepEqual(App.page.getKit(), before);
  assert.equal(App.page.getState().booking, null);
  assert.equal(result.receipt, undefined);
});

test("only catalogue prices and peer slot ids are ever used for the receipt", () => {
  App.page.resetState();
  const added = App.page.addPartToKit("belt_42", 1);
  assert.equal(added.kit.items[0].unitPrice, 18.0);
  const version = App.page.getKit().version;
  const booked = App.page.bookRepair({ slotId: "slot_early", expectedVersion: version });
  assert.equal(booked.ok, true);
  assert.equal(booked.receipt.total, 88); // 18.00 catalogue + 70.00 peer slot
  assert.match(booked.receipt.confirmation, /^FP-/);
});
