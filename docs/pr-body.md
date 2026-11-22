## Summary

Fixes the agent-quality defects found in the 1,188-event Fixpoint trace (`agent-trace-full.json`, 2026-11-22), with regression tests built from extracts of that trace.

**Evidence from the trace**

| Finding                                                                                                          | Sequence              |
| ---------------------------------------------------------------------------------------------------------------- | --------------------- |
| Fabricated `belt_42`, $18.00, $12.00 credit, "tahu-probe standard" and a fake quote inside a `render_cruse` card | s564/s565 → s698/s699 |
| "Corrected" §4.3 error that never appears in the trace                                                           | s567, s1086           |
| Duplicate `q1_drum_turns` widget                                                                                 | s293 + s324           |
| Garbled streamed text                                                                                            | s514                  |
| 1,016 tiny stream chunks, 21.3 s TTFT, 82.5 s turn                                                               | whole trace           |
| Truncated tool `resultPreview` (200–240 chars, no full result)                                                   | many                  |
| Prompt tokens grew ~3.1k → 7k per call                                                                           | whole trace           |

## Changes

- **Grounding guard (new `public/runtime/grounding.js`).** Builds a per-invocation fact ledger from tool results and drops any CRUSE component that asserts an unsupported part id, price, manual section, slot, receipt, "standard" or quote. Also drops cards that contradict prose saying "no price"/"no part". Applied both when `render_cruse` is called and when fenced `cruse-ui` blocks are parsed. Emits `presentation_grounding` trace notes.
- **Prompt/config hardening.** Adds a shared `evidence_rules` block to `fixpoint.hocon` and the network template, drift-checked at build time; regenerated `public/fixpoint.network.json`. `agentPresentationContext()` now treats child widgets as data, not drafts to re-author.
- **Dedup and budgets.** Near-duplicate choice widgets with the same stable id and option values merge into one; identical read-only `website_*` calls reuse one result per invocation (`tool_deduped`); `max_agent_calls: 8`; deadlines now honour `max_execution_seconds` via an `AbortController`.
- **Streaming.** Token fragments are buffered to word/sentence boundaries (size and time caps); `model_call` trace updates are batched and flushed on end; end spans carry `streamChunks`/`streamText`; `turn.completed` carries `firstDeltaMs`.
- **Trace observability.** One shared `preview()` helper; full tool result stored on the span as `result` while public previews stay bounded; `resultPreview`/`resultBytes` exposed in the observability bridge, public stream and dev panel.
- **Context growth.** History stores presentations structurally and is projected to widget ids for the model; `boundHistory()` applies a char budget; older tool messages are compacted in place while the fact ledger retains full values.

## Not changed

- **Booking / peer failures (Phase 3B)**: the two `agents_localpros` "Failed to fetch" errors are genuine transport failures to the RFC 2606 placeholder `pros.example`. The assistant already reported them honestly, invented no slot or price and made no booking. This workstream is explicitly owned by the site author and is untouched here.
- `src/components/assistant/AssistantWidget.tsx`: has uncommitted changes in the author's checkout; left alone to avoid clobbering them.
- No changes to the booking simulation (`slot_am`/`slot_pm`, local `FP-####` receipts) or the manual dataset.

## Before / after

| Metric                                         | Before               | After                          |
| ---------------------------------------------- | -------------------- | ------------------------------ |
| Fabricated card fields reaching `agent_result` | 5+                   | 0 (card component dropped)     |
| Duplicate `q1_drum_turns` widgets              | 2                    | 1                              |
| Identical manual-index calls per turn          | up to 2              | 1                              |
| Stream updates                                 | 1,016 tiny fragments | buffered to boundaries/windows |
| Full tool result in trace export               | not available        | `span.result`                  |
| TTFT measurement                               | none                 | `firstDeltaMs`                 |
| Card JSON replayed into every prompt           | yes                  | widget ids only                |

## Test plan

- `npm run check:network` — generated files in sync
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm test` — 23 tests passing (7 existing store tests + 16 new regression tests)
- `npm run build` — production build succeeds; `dist/runtime/grounding.js` copied by Vite
- Regression fixtures replay the exact bad card, duplicate widgets, garbled stream and truncated preview from the trace.

Full details and per-phase status: `docs/trace-quality-fix-plan.md`; baseline metrics: `docs/trace-baseline.md`.
