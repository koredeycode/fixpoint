# Plan: Fix the Fixpoint agent-trace quality defects

**Branch:** `fix/trace-grounding-and-quality`
**Worktree:** `/home/yusufakoredey/hackathons/trace-grounding-fixes`
**Base:** `main` @ `be2e45d`
**Evidence:** `/home/yusufakoredey/Downloads/agent-trace-full.json` (1,188 events, 8 turns, 2026-11-22)
**Companion analysis:** `/home/yusufakoredey/Downloads/agent-trace-report.md` and `agent-trace-viewer.html`

---

## 1. Goal and non-goals

Fix every defect found in the trace, in priority order, with regression tests, then open a PR.

**In scope:**
1. Fabricated part ID / price / fake "standard" / fake chat history inside `render_cruse` cards (HIGH).
2. Self-corrections of errors that never occurred; ungrounded citations (MED).
3. Duplicate `q1_drum_turns` widget, duplicate `diagnostic_tech` and repeated identical website reads (MED).
4. Garbled token-level streamed text (MED).
5. Tiny chunks, 21.3 s TTFT, 82.5 s turns (MED).
6. Truncated `resultPreview` in the trace (LOW).
7. Context growth 3.1k → 7k prompt tokens per call (LOW).
8. **Booking peer failures** — the two `agents_localpros` "Failed to fetch" errors: the assistant's honest handling was correct; fix only the runtime's error classification, attempted-URL tracing, timeout and consent context, without ever inventing a slot, price or booking (MED; see Phase 3B).
9. Preserve the behaviours that were already correct (honest failure reporting, no invented slots/bookings, safety advice).

**Non-goals:** changing the model/router, changing the manual dataset's actual content, changing product UI design, or committing the 1.1 MB raw trace or its HTML viewer to the repo.

---

## 2. Source-of-truth reminders

| Change | Edit here | Then |
|---|---|---|
| Agent instructions / grounding rules | `fixpoint.hocon` (`commondefs.replacement_strings`) | `npm run build:network` regenerates `public/fixpoint.network.json`, `agent-mcp.json`, `.well-known/*`, `bridge/*` |
| Runtime logic | `public/runtime/*.js` | `vite build` copies to `dist/` — **never edit `dist/`** |
| Website tool schemas | `public/site-actions.js` | verify with `npm run test:actions` |
| Store behaviour | `public/store.js` | tests in `tests/actions.test.mjs` |
| React shell | `src/**` | `npm run typecheck`, `vitest` |

Commands (from `package.json`): `npm run build`, `npm run check:network`, `npm run lint`, `npm run format:check`, `npm test`, `npm run typecheck`. CI (`.github/workflows/ci.yml`) runs all of them on Node 22. Note: ESLint currently **ignores `public/runtime/`**, so new runtime code needs its own tests and careful review.

---

## 3. Workstreams

### Phase 0 — Baseline and regression harness
**Why:** every finding needs a failing test derived from the real trace before the fix.

- Add `tests/fixtures/trace-defects.mjs` containing small, redacted extracts from the trace:
  - the `wx200_spindiag` card payload with `belt_42`, `$18.00`, `$12.00 staging credit`, `tahu-probe standard`, and the fake "round eleven" note;
  - the two near-duplicate `q1_drum_turns` presentations;
  - the garbled `s514` stream text;
  - the two `agents_localpros` error spans;
  - a sample of the 1-char stream chunks and a 200-char truncated `resultPreview`.
- Add `tests/runtime-grounding.test.mjs` (node:test, picked up by `npm run test:actions`) importing `public/runtime/cruse.js`, `actions.js`, `trace.js`, `execution-stream.js` as ES modules.
- Capture baseline metrics (tokens, chunk count, TTFT, turn duration) from the trace into `docs/trace-baseline.md` so improvements are measurable.
- **Acceptance:** tests reproduce each defect against current code (red), CI commands all pass beforehand (green baseline).

### Phase 1 — Grounding validation for presentations (HIGH)
**Problem:** `render_cruse` accepts any structurally valid card; no field is checked against tool facts. The bad card was accepted (seq 565) and shipped in `agent_result` (seq 699).

- **Fact ledger:** in `runner.js` `runAgentManual()`/`dispatchToolCall()` (lines ~563-607, ~347-364), collect a per-turn ledger from tool results already in `messages`: tool name → parsed JSON. Extract authoritative values: part IDs, prices, kit totals/versions, manual sections/anchors, slot IDs, receipt codes, question IDs and option values from `website_get_symptom_tree`.
- **Validator:** add `validatePresentationGrounding(presentation, ledger)` in `cruse.js` (or `actions.js` beside `validatePresentation`). Scan `info.fields`, `report.markdown`, `table.rows`, `chart.summary`, `html` and option subtitles for:
  - IDs shaped like `belt_42`, `slot_*`, `receipt_*`;
  - currency amounts (`$18.00`, `$12.00`);
  - manual section references (`§4.4`, `§4.3`);
  - quoted user statements / "standard" names not present in the ledger or conversation.
  Any claim not found verbatim in the ledger is **unsupported**.
- **Enforcement:** in `runner.js` presentation branch, reject unsupported cards before setting `ctx.presentationOutput` — emit a `presentation_rejected` trace note with the offending fields, return an acceptance receipt that says the card was dropped, and let the final prose answer stand. Do **not** silently rewrite numbers. For mixed cards, strip only the offending fields/components when safe.
- **Prose/card consistency:** if a card asserts a price while the prose says none exists, drop the card (the trace's self-contradiction case).
- Also apply the validator to fenced ` ```cruse-ui ` blocks extracted by `parseAgentResponse()` (`cruse.js:108-153`), since those bypass tool dispatch.
- **Acceptance:** the fixture card from Phase 0 is rejected with a trace note; a correctly grounded table built from `website_get_kit`/`get_symptom_tree` still passes; no regression in `tests/actions.test.mjs`.

### Phase 2 — Prompt and context fixes for confabulated corrections/citations (MED)
**Problem:** "§4.3" appears only inside the two corrections; "tahu-probe standard" and "round eleven" appear nowhere. `agentPresentationContext()` tells the child to "consolidate" proposals while `fixpoint.hocon:109` says not to redo the diagnosis — conflicting guidance encourages rewriting.

- Tighten `grounding_rules` in `fixpoint.hocon` (and `tooling/templates/network.hocon` for parity):
  - cite only section/date/id strings that appear verbatim in a tool result;
  - never claim to have corrected an earlier mistake unless the erroneous text is actually present in the visible conversation;
  - never name a standard, policy, quote, or prior visitor statement that is not in tool results or user messages;
  - never use prose to contradict a card or a card to contradict prose — if they disagree, say so and use the tool result.
- Reconcile `cruse.js:155-162` `agentPresentationContext()` with `fixpoint.hocon:109,151-153`: child proposals are *data* for the front man, not drafts to be re-authored with extra detail.
- Stop feeding raw card JSON back as assistant chat text (see Phase 6) — this removes the "prior card as fake history" vector.
- Strengthen `build_network.mjs:checkTemplateRules()` (497-518) to drift-check `grounding_rules` as well as `partner_rules`.
- Regenerate `public/fixpoint.network.json` with `npm run build:network` and verify `npm run check:network`.
- **Acceptance:** a scripted-model test (extend `tooling/templates/tests/scripted_model.mjs` pattern) with a tool result lacking a price produces no price in either prose or card; no `§4.3` string can be emitted unless a tool result contains it.

### Phase 3 — Dedup and call budgets (MED)
**Problem:** `q1_drum_turns` rendered twice with different wording; `diagnostic_tech` invoked twice; manual index 4× and symptom tree 2× with identical args.

- `cruse.js:48-76` — extend dedup beyond byte-canonical equality: components with the same stable `id` and same option `value` set are the same question. Keep the first (or merge titles), drop the later; emit a `presentation_deduped` trace note.
- `cruse.js:80-104` `consolidateIntakePresentations()` — collapse same-id choices from multiple children instead of appending all.
- `runner.js:297-345` `executeToolCalls()` — add a per-turn cache keyed by `name + canonical(args)` for read-only tools (`website_get_manual_index`, `website_get_symptom_tree`, `website_get_kit`); the first result is reused and the skipped call is traced as `tool_deduped`. Never cache mutating tools (`add_part_to_kit`, `book_repair`) or remote peers.
- Reduce `maxCallsPerAgent` budget in `engine.js:526-534` to a realistic number and make it configurable from `fixpoint.hocon`; keep `maxCallsPerPeer: 1`.
- Tighten prompts so the front man delegates once and does not re-fetch the manual itself.
- **Acceptance:** replaying the trace's duplicate payload yields exactly one `q1_drum_turns` widget and one manual-index/symptom-tree result per turn; tests cover both exact and near-duplicate cases.

### Phase 3B — Booking / peer failure handling (MED) — "book a pro" errors
**Problem:** the two `agents_localpros` lookups failed with browser-level `Failed to fetch` (tool spans s705/709 and s905/908; `remote_fetch` spans s707/708 and s906/907). **The assistant's behavior was correct and must be preserved**: it reported a failed lookup (not "no availability"), invented no slot/date/price/receipt, re-verified the empty kit, made no `book_repair` call, and retried only when the visitor explicitly asked. The defects are in runtime observability and robustness, not in the answer:
- `remote_fetch.url` records the peer ref (`…/agents/localpros`) while the code actually fetches `…/agent-manifest.json` (`engine.js:401-419` → `remote.js:6-12`); `fetchedUrls` is written only on success (`engine.js:433`), so a failed span doesn't show the attempted URL.
- `Failed to fetch` is an opaque browser TypeError (DNS/CORS/TLS/offline) with no `errorKind`, no HTTP status and no request context.
- `fetch()` has no timeout/abort, so a hanging peer could stall a turn.
- `peer_consent` records only `{decision: "always"}` — no peer origin or request preview.

- Keep the current honest behaviour as a **test contract**: failed lookup reported as a failure, no slot/price/receipt invented, kit unchanged, no `website_book_repair` call, second attempt only on explicit user request.
- `engine.js:411-419,437-440` — put the **actual attempted manifest URL** on the `remote_fetch` span and keep the peer ref in a separate `peerRef` field; include it on the failure path too, since `fetchedUrls` is success-only.
- `public/runtime/remote.js:6-19` — classify failures (`network_unreachable`, `timeout`, `cors_blocked`, `http_error`, `empty_reply`) into `errorKind` on the error span, preserving the raw `error` string; add an abort/timeout so a hanging peer cannot stall the turn.
- Enrich the `peer_consent` note with `peerOrigin` and a short request preview.
- **Do NOT add an automatic retry.** `partner_rules` (`fixpoint.hocon:67`) caps partner calls at once per visitor message, and the user-driven retry in turn `s901` is the correct behaviour. Keep one call per message; offer an explicit retry in the UI instead.
- **Document the real scope of booking:** it is a *local simulation*, not a live service. `public/data/manuals.js:269-272` hardcodes `slot_am`/`slot_pm`; `public/store.js:159-170` mints an in-browser `FP-####` receipt; `pros.example` is an RFC 2606 placeholder that cannot resolve. Nothing in this workstream should imply a real booking occurred — keep the "the pro finalises on their own page" framing from `booking_clerk`.
- Keep `booking_clerk` / `website_book_repair` gated on a confirmed slot id **and** a staged part (store checks at `public/store.js:137-170`); existing tests already cover stale `expectedVersion` and receipt totals.
- **Acceptance:** a simulated peer rejection produces one error span with `errorKind` and the correct attempted URL, no slot/price in the answer, no booking and an unchanged kit; a timeout aborts cleanly; replaying the two trace failures yields correct classification and the existing honest prose.

### Phase 4 — Streaming buffer and latency (MED)
**Problem:** 1,016 updates (~9 chars each, some 1 char), 21.3 s TTFT, 82.5 s turns; deadline configured but not enforced mid-call.

- `llm.js:181-186` / `runner.js:580-582` / `engine.js:361` — buffer `onContentDelta` text until a threshold (e.g. ≥24 chars **or** word/sentence boundary **or** ≤150 ms flush) before forwarding; still record the raw chunks in the trace, but aggregate them.
- `trace.js:37-42` — batch `model_call` updates (e.g. flush every 100 ms) instead of re-emitting a full merged span per token; keep the final `streamChunk` text in the end event so the trace export remains complete.
- `execution-stream.js:126-133` — emit one `agent.output.delta` per buffer flush with `visibility: "user"` only for the top agent; add a `firstDeltaMs` (TTFT) field on `turn.completed`.
- `engine.js:533` — honor `max_execution_seconds` from `fixpoint.hocon` (currently dead config: 120 s) and enforce it with an `AbortController` passed into `llm.chat()` so a call can be cancelled mid-stream, not only between steps.
- Add a status line ("diagnosing…") for tool-only phases so TTFT isn't perceived as silence.
- **Acceptance:** a replay with the fixture's 1-char chunks emits ≤1/10 as many deltas; exported trace still contains the full final text; a simulated call exceeding the deadline aborts with a `turn.failed` event.

### Phase 5 — Trace observability (LOW)
**Problem:** `resultPreview` clipped to 200/240 chars everywhere; `observability.js` drops it entirely; raw export still lacks full tool results.

- Centralize preview sizing in `trace.js` with a configurable `previewLimit` (default 200 for the public stream, full for local export behind `?debug` or an explicit flag).
- `runner.js:327/332/606/642` — store the full sanitized tool result on the span (e.g. `result`) while keeping a short `resultPreview` for streaming; sanitize secrets with the same `redact()` used in `observability.js`.
- `observability.js:29-54` — include `resultPreview` in redacted rows; `ui.js:1795/1802-1808` — show it in the trace log and detail JSON.
- `execution-stream.js:58-61/152/159` — use the centralized helper; add `tool_result_bytes` metadata so truncation is explicit.
- **Acceptance:** a tool result >1,000 chars is fully recoverable from `rawTrace()` while the public stream still carries only a bounded preview; test asserts both.

### Phase 6 — Context growth (LOW)
**Problem:** prompt tokens 3,100 → 7,028 per call; 3,072 cached each time.

- `engine.js:541-547` — store `presentation` as a structured field on the history entry instead of serializing card JSON into the assistant text. Build the model-visible history from that structure with a short summary only.
- `runner.js:563-607` — prune or summarize tool results older than the current step (keep the ledger from Phase 1 for grounding), and avoid re-sending the full tool schema table on every step when unchanged.
- Replace the 24-message cap with a token-budget-aware trim; keep the most recent user turn, the ledger, and the last two tool results.
- `AssistantWidget.tsx:101-209` — cap the scraped DOM history and reuse the same structured context (only after the uncommitted `main` changes are reconciled — see §4).
- **Acceptance:** a 10-turn replay keeps prompt tokens roughly flat (±15%) after turn 3; grounding still works because the ledger survives pruning.

### Phase 7 — Verification, docs, PR
- Run the full CI matrix locally: `npm run check:network && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`.
- Manually replay the original conversation with a scripted/mock model and compare the new trace against `docs/trace-baseline.md`; assert: no fabricated part/price, no duplicate widget, no `§4.3`, full tool results in export, fewer deltas, and the two `agents_localpros` failures classified with `errorKind` and the correct attempted URL while still producing no booking.
- Update `docs/trace-quality-fix-plan.md` with a "Status" column, and `README.md` only if runtime behaviour changes need documenting.
- Commit in logical chunks (one per phase where practical), push the branch, open the PR (details in §5).

---

## 4. Risks and open questions

1. **Uncommitted work on `main`.** Five files are modified there (`fixpoint.hocon`, `public/data/manuals.js`, `public/fixpoint.network.json`, `public/store.js`, `src/components/assistant/AssistantWidget.tsx`) — source-URL citations, a regenerated network file, and three observability notes. They are *not* in this clean worktree. Before finishing, reconcile: either cherry-pick those changes into this branch (preferred if they are intended to ship), or rebase this branch onto `main` after they are committed, then regenerate the network file. **Do not overwrite them.** Ask the user which they prefer if unclear.
2. **`dist/` staleness.** `dist/data/manuals.js` is already stale relative to `public/data/manuals.js`. `npm run build` refreshes it; do not hand-edit `dist/`.
3. **Runtime JS is not linted.** ESLint ignores `public/runtime/`. New logic there must be covered by node:test files and reviewed manually.
4. **Grounding validator strictness.** Over-strict matching could reject legitimate grounded tables (e.g. a price quoted from a peer reply). Start with a allow-list of known claim shapes, emit trace notes rather than hard failures in the first pass, and tighten after observing a replay.
5. **Prompt hardening cannot guarantee model behaviour.** Phase 1 runtime validation is the real safety net; prompt changes are defence in depth.
6. **The environment's `pros.example` peer is unreachable.** The `.example` TLD is reserved (RFC 2606), so the two failures are genuine transport errors and the assistant's honest reporting was correct. Phase 3B only improves classification/URL tracing/timeout — do not fake availability, do not add an automatic retry (that would break "once per visitor message"), and assert no slot, price, receipt or booking is invented on error.

---

## 5. PR plan

**Title:** `fix: ground CRUSE cards, dedupe tool calls, harden peer booking failures and trace/streaming`

**Base:** `main` ← **Head:** `fix/trace-grounding-and-quality`

**Body outline:**
- Summary of the 9 findings with trace sequence IDs as evidence (including both booking-peer failures).
- What changed, grouped by phase, with file references.
- Before/after table: fabricated card rejected, duplicate widgets 2→1, chunks 1,016→~100, preview full in export, prompt tokens flat, peer errors classified with no invented slot/booking.
- Test plan: commands run and their results; scripted replay comparison.
- Note the reconciliation of the uncommitted `main` work (§4.1).

**Checklist before requesting review:**
- [ ] `npm run check:network` passes (generated files in sync)
- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` pass
- [ ] `npm test` passes, including new regression tests
- [ ] `npm run build` passes; `dist/` changes are from the build only
- [ ] No raw trace, API keys, `.env.local`, or personal data committed
- [ ] PR description includes before/after evidence and the reconciliation note

**Completion:** push with `git push -u origin fix/trace-grounding-and-quality`, then `gh pr create --base main --head fix/trace-grounding-and-quality --title … --body-file …`; verify the PR opened and report the URL.

---

## 6. Definition of done

Every finding from the analysis report has either (a) a runtime guard with a passing regression test, (b) a prompt/config fix with a scripted-model test, or (c) an explicit accepted-risk note in the PR. The replay of the original trace shows zero fabricated part IDs/prices/sections, one widget per question, bounded stream deltas, full tool results in the exported trace, and stable prompt-token usage — while the two booking failures are classified (`errorKind`, attempted URL), still reported honestly, and no slot, price, receipt or booking is invented.
