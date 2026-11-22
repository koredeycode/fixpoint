// Grounded demo dataset for Fixpoint.
// Structure mirrors a published troubleshooting tree: symptom -> steps -> questions -> resolution.
// Replace with licensed/real manual data before the video. Never invent facts in agent instructions.
// Snapshot date for this dataset: 2026-11-21 (see fixpoint.hocon metadata.source).

export const MANUALS_DATA = {
  // Base for site-side deep links. store.js builds stable hashes such as
  // #washer_wx200--wont_spin, so citations survive edits to this file.
  sourceUrl: "https://askfixpoint.vercel.app/",
  appliances: [
    {
      id: "washer_wx200",
      name: "Washer WX-200",
      manual: "WX-200 Service Manual, §4 'Drive system'",
      symptoms: [
        {
          id: "wont_spin",
          name: "Drum will not spin",
          steps: [
            {
              id: "q1_drum_turns",
              question: "Does the drum turn freely by hand with the machine unplugged?",
              options: [
                {
                  value: "stuck",
                  title: "No, it is stuck",
                  note: "Inspect for jam or seized bearing",
                },
                {
                  value: "free",
                  title: "Yes, it spins easily",
                  note: "Continue to the belt check",
                },
              ],
            },
            {
              id: "q2_humming",
              question: "When you select a spin cycle, do you hear a low humming sound?",
              options: [
                {
                  value: "hum",
                  title: "Yes, it hums",
                  note: "Motor is trying to turn: belt is likely worn",
                },
                {
                  value: "silent",
                  title: "No, it is silent",
                  note: "Check the lid interlock and power supply",
                },
              ],
              requires: "q1_drum_turns=free",
            },
          ],
          resolution: {
            belt: {
              partId: "belt_42",
              diagnosis: "Worn drive belt (WX-200 Service Manual §4.2)",
              advice:
                "Unplug the machine before removing the old belt. Compare the new belt's length with the old one before fitting.",
            },
            jam: {
              diagnosis: "Obstruction or seized bearing (WX-200 Service Manual §4.4)",
              advice:
                "Clear the obstruction; if the drum still binds, the bearing must be replaced by a pro.",
            },
            interlock: {
              diagnosis: "Lid interlock or supply fault (WX-200 Service Manual §4.1)",
              advice:
                "Check the lid closes fully and the outlet is live. No part is staged from this branch.",
            },
          },
        },
        {
          id: "wont_drain",
          name: "Water will not drain",
          steps: [
            {
              id: "q1_pump_filter",
              question: "Is the pump filter behind the lower access flap blocked?",
              options: [
                {
                  value: "blocked",
                  title: "Yes, it is full of debris",
                  note: "Clean the filter; no part needed",
                },
                { value: "clear", title: "No, it is clear", note: "Continue to the hose check" },
              ],
            },
            {
              id: "q2_hose",
              question: "Is the drain hose kinked or pushed too far into the standpipe?",
              options: [
                { value: "kinked", title: "Yes", note: "Straighten the hose; no part needed" },
                { value: "ok", title: "No, it is fine", note: "The drain pump may have failed" },
              ],
              requires: "q1_pump_filter=clear",
            },
          ],
          resolution: {
            pump: {
              partId: "pump_17",
              diagnosis: "Failed drain pump (WX-200 Service Manual §5.3)",
              advice: "Disconnect power and water before checking the pump impeller.",
            },
            filter: {
              diagnosis: "Blocked pump filter (WX-200 Service Manual §5.1)",
              advice: "No part needed. Clean the filter and run a short rinse cycle.",
            },
            hose: {
              diagnosis: "Kinked drain hose (WX-200 Service Manual §5.2)",
              advice:
                "No part needed. Straighten the hose and ensure no more than 10 cm enters the standpipe.",
            },
          },
        },
      ],
    },
    {
      id: "dishwasher_dx100",
      name: "Dishwasher DX-100",
      manual: "DX-100 Owner's Guide, §7 'Water and drainage'",
      symptoms: [
        {
          id: "not_draining",
          name: "Water will not drain",
          steps: [
            {
              id: "q1_filter",
              question: "Is the filter at the bottom of the tub blocked with food debris?",
              options: [
                {
                  value: "blocked",
                  title: "Yes, it is blocked",
                  note: "Clean the filter and rerun a short cycle",
                },
                {
                  value: "clear",
                  title: "No, it is clear",
                  note: "Continue to the drain hose check",
                },
              ],
            },
            {
              id: "q2_hose",
              question: "Is the drain hose kinked or pushed too far into the standpipe?",
              options: [
                { value: "kinked", title: "Yes", note: "Straighten the hose; no part needed" },
                {
                  value: "ok",
                  title: "No, the hose is fine",
                  note: "The drain pump may need replacement",
                },
              ],
              requires: "q1_filter=clear",
            },
          ],
          resolution: {
            pump: {
              partId: "pump_17",
              diagnosis: "Blocked or failed drain pump (DX-100 Guide §7.3)",
              advice: "Disconnect power and water before checking the pump impeller.",
            },
            filter: {
              diagnosis: "Blocked filter (DX-100 Guide §7.1)",
              advice: "No part needed. Clean the filter and run a rinse cycle.",
            },
            hose: {
              diagnosis: "Kinked drain hose (DX-100 Guide §7.2)",
              advice:
                "No part needed. Straighten the hose; do not push it deeper than 10 cm into the standpipe.",
            },
          },
        },
      ],
    },
    {
      id: "fridge_fr400",
      name: "Fridge FR-400",
      manual: "FR-400 Service Guide, §3 'Cooling circuit'",
      symptoms: [
        {
          id: "not_cooling",
          name: "Fridge is not cooling",
          steps: [
            {
              id: "q1_cleaning",
              question: "When did you last clean the condenser coils at the back?",
              options: [
                {
                  value: "old",
                  title: "More than a year ago",
                  note: "Clean the coils first; no part needed",
                },
                {
                  value: "recent",
                  title: "Within the last year",
                  note: "Continue to the fan check",
                },
              ],
            },
            {
              id: "q2_fan",
              question: "Does the condenser fan at the back spin when the compressor runs?",
              options: [
                { value: "still", title: "No, it does not spin", note: "Condenser fan has failed" },
                {
                  value: "spins",
                  title: "Yes, it spins",
                  note: "Continue to the thermostat check",
                },
              ],
              requires: "q1_cleaning=recent",
            },
            {
              id: "q3_thermostat",
              question: "With the thermostat at maximum, does the compressor ever start?",
              options: [
                {
                  value: "never",
                  title: "No, it stays silent",
                  note: "Thermostat may have failed",
                },
                {
                  value: "cycles",
                  title: "Yes, it cycles on and off",
                  note: "See the service guide for sealed-system checks",
                },
              ],
              requires: "q2_fan=spins",
            },
          ],
          resolution: {
            coils: {
              diagnosis: "Dust-blocked condenser coils (FR-400 Guide §3.1)",
              advice:
                "No part needed. Unplug the fridge and brush the coils gently; allow 24 hours to cool down.",
            },
            fan: {
              partId: "fan_11",
              diagnosis: "Failed condenser fan (FR-400 Guide §3.2)",
              advice:
                "Unplug before reaching behind the appliance. Clear any ice or debris from the fan guard first.",
            },
            thermostat: {
              partId: "thermostat_22",
              diagnosis: "Failed thermostat (FR-400 Guide §3.3)",
              advice:
                "Unplug the appliance. If the compressor still never starts, a pro must check the sealed system.",
            },
            sealed: {
              diagnosis: "Possible sealed-system fault (FR-400 Guide §3.4)",
              advice:
                "No part is staged from this branch: sealed-system work must be done by a qualified pro.",
            },
          },
        },
      ],
    },
  ],
  parts: [
    { id: "belt_42", name: "BELT-42 Drive belt", price: 18.0, fits: ["washer_wx200"] },
    {
      id: "pump_17",
      name: "PUMP-17 Drain pump",
      price: 47.5,
      fits: ["washer_wx200", "dishwasher_dx100"],
    },
    { id: "filter_09", name: "FILTER-09 Filter assembly", price: 12.0, fits: ["dishwasher_dx100"] },
    { id: "fan_11", name: "FAN-11 Condenser fan", price: 24.0, fits: ["fridge_fr400"] },
    { id: "thermostat_22", name: "THERM-22 Thermostat", price: 32.0, fits: ["fridge_fr400"] },
  ],
  slots: [
    { id: "slot_am", label: "Tomorrow, 09:00–12:00", price: 65 },
    { id: "slot_pm", label: "Tomorrow, 13:00–16:00", price: 55 },
  ],
};
