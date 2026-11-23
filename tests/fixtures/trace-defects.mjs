// Small, redacted extracts from agent-trace-full.json used as regression inputs.
// No API keys, personal data or raw chat export is stored here.

export const BAD_CARD = {
  version: 1,
  components: [
    {
      id: "wx200_spindiag",
      kind: "report",
      title: "WX-200 — drum will not spin: spin-drive diagnosis",
      markdown:
        "**Checks so far**\n\n| Check | Your answer | What it means |\n|---|---|---|\n| Spin test (unplugged) | Items staged: 0 · Total: $0.00 · Kit version: 0 | Unplug the washer and turn the drum by hand.\n\n**Most likely cause:** the **drive belt (part**—`belt_42`, **$18.00** — a $12.00 staging credit applies) has slipped off the motor or drum pulley. This is one of the three parts available at the front desk.\n\nIf the motor hums at spin but the drum stays still, the tahu-probe standard is to isolate the belt before condemning the motor or its control board.\n\nCast-in note: you said spin won't be diagnosed on the WX-200 will-not-spin round eleven.",
    },
    {
      id: "wx200_next",
      kind: "choice",
      title: "Next step",
      options: [
        {
          title: "Book a pro for the drum jam",
          value: "book",
          subtitle: "I'll find an available slot before anything is booked.",
        },
        { title: "Stop for now", value: "stop" },
      ],
    },
  ],
};

export const GROUNDED_CARD = {
  version: 1,
  components: [
    {
      id: "wx200_grounded",
      kind: "table",
      columns: ["Part", "Price"],
      rows: [["belt_42", "$18.00"]],
    },
    {
      id: "wx200_grounded_section",
      kind: "info",
      fields: { "Manual section": "WX-200 Service Manual §4.4" },
    },
  ],
};

export const DUPLICATE_WIDGETS = {
  version: 1,
  components: [
    {
      id: "q1_drum_turns",
      kind: "choice",
      title: "Does the drum turn freely by hand with the machine unplugged?",
      options: [
        { title: "No, it is stuck", value: "stuck", subtitle: "Inspect for jam or seized bearing" },
        { title: "Yes, it spins easily", value: "free", subtitle: "Continue to the belt check" },
      ],
    },
    {
      id: "q1_drum_turns",
      kind: "choice",
      title: "Step 1 of the spin drive check",
      purpose:
        'WX-200 Service Manual §4 "Drive system" — this first branch separates a jam from a belt/motor fault.',
      options: [
        { title: "No, it's stuck", value: "stuck", subtitle: "Points to a jam or seized bearing" },
        {
          title: "Yes, it spins freely",
          value: "free",
          subtitle: "Continue to the drive belt check",
        },
      ],
      footer: "Unplug the washer first, then turn the drum by hand.",
    },
  ],
};

// Tool results from the trace, truncated to the fields the ledger reads.
export const TOOL_RESULTS = {
  manualIndex: JSON.stringify({
    status: "succeeded",
    result: {
      ok: true,
      appliances: [{ id: "washer_wx200", manual: "WX-200 Service Manual, §4 'Drive system'" }],
    },
  }),
  symptomTree: JSON.stringify({
    status: "succeeded",
    result: {
      ok: true,
      appliance: "Washer WX-200",
      manual: "WX-200 Service Manual, §4 'Drive system'",
      resolution: {
        jam: {
          diagnosis: "Obstruction or seized bearing (WX-200 Service Manual §4.4)",
          advice: "Clear the obstruction.",
        },
        belt: { partId: "belt_42", diagnosis: "Worn drive belt (WX-200 Service Manual §4.2)" },
      },
    },
  }),
  kit: JSON.stringify({
    status: "succeeded",
    result: { ok: true, items: [], version: 0, total: 0 },
  }),
  parts: JSON.stringify({
    status: "succeeded",
    result: { ok: true, parts: [{ id: "belt_42", price: 18 }] },
  }),
};

export const GARBLED_STREAM = [
  "Because you cannot answer ",
  "nothing is staged — ",
  "**nothing is staged.** No part ID was specified for the ",
  '"nothing here".',
];

export const TRUNCATED_PREVIEW =
  '{"action":"https://askfixpoint.vercel.app/fixpoint#get_symptom_tree","requestId":"ba55a10b-1b6b-4b6f-949c","status":"succeeded","result":{"ok":true,"appliance":"Washer WX-200","manual":"WX-200 Service Manual, §4 \'Drive system\'';

export const PEER_ERRORS = [
  { seq: 708, kind: "remote_fetch", error: "Failed to fetch", durationMs: 90.7 },
  {
    seq: 709,
    kind: "tool",
    tool: "agents_localpros",
    error: "Failed to fetch",
    durationMs: 7544.4,
  },
  { seq: 907, kind: "remote_fetch", error: "Failed to fetch", durationMs: 85.3 },
  { seq: 908, kind: "tool", tool: "agents_localpros", error: "Failed to fetch", durationMs: 100.9 },
];
