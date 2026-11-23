# Post-fix trace verification

Source: `/home/yusufakoredey/Downloads/agent-trace-full (1).json` — generated 2026-11-23T01:28:38.330Z, 294 events, 4 turns.
Baseline: `docs/trace-baseline.md` (original trace, 1,188 events, 8 turns).

This trace was recorded after PR #1 was merged and deployed: model calls carry `streamChunks`/`streamText`, tool spans carry the full `result`, and history no longer embeds ` ```cruse-ui ` JSON.

## Measured improvements

| Metric                                                                        | Baseline                     | Post-fix trace                            |
| ----------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| Events                                                                        | 1,188                        | 294 (4 turns vs 8)                        |
| Stream `update` events                                                        | 1,016                        | **138** (−86%)                            |
| Worst TTFT                                                                    | 21,342.8 ms                  | **10,904.8 ms** (−49%; median 2,947.9 ms) |
| Largest emitted chunk                                                         | often 1 char                 | 121 chars                                 |
| Full tool result in trace                                                     | absent                       | **20/20** tool end spans have `result`    |
| Embedded card JSON in history (`CRUSE presentation turn`)                     | present                      | **0**                                     |
| Fabricated `belt_42` / $18.00 / $12.00 credit / "tahu-probe" / "round eleven" | present                      | **0 occurrences**                         |
| `§4.3` false self-correction                                                  | present                      | **0**                                     |
| Tokens / cost                                                                 | 117,533 / $0.00718 (8 turns) | 94,018 / $0.00603 (4 turns)               |
| Model calls                                                                   | 25 (8 turns, ~3.1/turn)      | 24 (4 turns, **~6/turn**)                 |
| Slowest turn                                                                  | 82,472.7 ms                  | **96,344.3 ms**                           |

The grounding and read-dedup guards did not fire (`presentation_grounding` / `tool_deduped` notes absent): no unsupported widget or identical read was generated in this session. They remain covered by the unit tests in `tests/runtime-quality.test.mjs`.

## What worked

- Final answers stayed grounded, cited the deep-linked manual section, and correctly refused the booking because the kit is empty and the §4.4 jam branch stages no part. No slot, price or receipt was invented.
- The only error is an honest store refusal: `website_book_repair` → `There are no parts in the kit to book.`
- Full tool payloads are recoverable from the trace export while public previews remain bounded.

## Remaining issues addressed in this follow-up

1. **Redundant booking call.** `booking_clerk` already returned "no parts staged — booking not attempted" (trace seq 241), yet the front man still called `website_book_repair` (seq 251), producing an avoidable error event. Fix: skip the irreversible tool call when the current turn's `website_get_kit` result shows an empty kit, and emit a `tool_skipped` note instead.
2. **Duplicate reads across agents.** `website_get_manual_index` was fetched by both the front man and `diagnostic_tech` in the same turn. The read cache was per invocation; it is now shared through `composition` for the whole turn, with epoch invalidation on writes.
3. **Peers not exercised by the trace.** PR #2 merged at 2026-11-23T00:55:42Z, before this trace, and the advertised `toolNames` include `localpros` and `spareparts` — so availability was not the issue. There is no `peer_consent` note and no `remote_fetch` span, meaning the model never emitted a peer tool call. Contributing factors: the user supplied `slot_early` directly; `website_get_manual_index` now returns local `slots`; `booking_clerk` was instructed to use those local slots; and the jam branch needs no part, so `spareparts` was irrelevant. To exercise the peer path, ask for live stock ("check stock on BELT-42") or for slots without supplying one ("what slots do you have next week?"), or remove `slots` from the local manual index so the model must query the peer.

## Scope caveat

This trace cannot validate PR #2's peer-fetch hardening (error taxonomy, timeout, attempted-URL tracing) because no peer call was made. Those changes are covered only by `tests/peer-fetch.test.mjs` until a trace with a real peer call is captured.
