# Trace baseline (before the quality fixes)

Source: `/home/yusufakoredey/Downloads/agent-trace-full.json`, generated 2026-11-22T22:41:07.474Z.

| Metric                    | Baseline                                                                | Target after fixes                                               |
| ------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Events                    | 1,188 (1,016 `update`)                                                  | fewer updates after batching                                     |
| User turns                | 8                                                                       | 8                                                                |
| Agents                    | 10 (8 front man, 2 diagnostic_tech)                                     | ≤ 6 expected: one front man + one diagnostic per diagnostic turn |
| Model calls               | 25                                                                      | unchanged or fewer                                               |
| Tool calls                | 19                                                                      | fewer (manual index 4→1, symptom tree 2→1)                       |
| Website tool duplicates   | manual index ×4, symptom tree ×2, kit ×4                                | one per distinct args per turn                                   |
| `q1_drum_turns` widgets   | 2 in turn `s233`                                                        | 1                                                                |
| Stream chunks             | 1,016 (`model_call` updates)                                            | ≤ ~100 with buffering                                            |
| Worst TTFT                | 21,342.8 ms (`s548`)                                                    | instrumented (`firstDeltaMs`) and improved                       |
| Slowest turn              | 82,472.7 ms (`s388`)                                                    | reduced by dedup/budget changes                                  |
| Prompt tokens/call        | ~3,100 → 7,028 (+126%)                                                  | roughly flat after turn 3                                        |
| Total tokens              | 117,533                                                                 | lower                                                            |
| Cost                      | $0.00718                                                                | lower                                                            |
| `resultPreview` length    | 200–240 chars, full result never exported                               | full result in `rawTrace()`, bounded preview in public stream    |
| Fabricated card fields    | `belt_42`, $18.00, $12.00 credit, "tahu-probe standard", "round eleven" | 0                                                                |
| Unsupported section claim | "§4.3" (only inside self-corrections)                                   | 0                                                                |
| Garbled streamed text     | `s514`: "nothing is staged — nothing is staged…"                        | not emitted to the public stream                                 |
| Booking peer failures     | 2 (`Failed to fetch`), 4 error events                                   | unchanged (user-owned workstream Phase 3B)                       |
| Bookings made             | 0                                                                       | 0                                                                |

## Sequences used as evidence

- `s564`/`s565` — `render_cruse` accepts the card with the fabricated part, price, "standard" and chat-history quote; seq 698/699 attach it to the final answer.
- `s293` + `s324` — duplicate `q1_drum_turns` widgets.
- `s514` — garbled streamed text.
- `s25`/`s30`, `s239`/`s240`, `s394`/`s395`, `s396`/`s398` — repeated identical tool calls.
- `s707`/`s708`, `s906`/`s907` — failed peer fetches (Phase 3B, left to the site owner).
