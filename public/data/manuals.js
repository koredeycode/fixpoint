// Grounded demo dataset for Fixpoint.
// Structure mirrors a published troubleshooting tree: symptom -> steps -> questions -> resolution.
// Replace with licensed/real manual data before the video. Never invent facts in agent instructions.
// Snapshot date for this dataset: 2026-11-21 (see fixpoint.hocon metadata.source).
// Dataset version 0.2.0: adds source sections, safety notes, technician-only flags and
// three extra grounded trees. All part ids, prices and slot ids from 0.1.0 are unchanged.

export const MANUALS_DATA = {
  datasetVersion: "0.2.0",
  // Base for site-side deep links. store.js builds stable hashes such as
  // #washer_wx200--wont_spin, so citations survive edits to this file.
  sourceUrl: "https://askfixpoint.vercel.app/",
  appliances: [
    {
      id: "washer_wx200",
      name: "Washer WX-200",
      manual: "WX-200 Service Manual, §4 'Drive system'",
      sourceAnchor: "#L12-L14",
      symptoms: [
        {
          id: "wont_spin",
          name: "Drum will not spin",
          section: "WX-200 Service Manual §4 'Drive system'",
          summary: "Separates a mechanical jam from a worn drive belt or lid interlock fault.",
          steps: [
            {
              id: "q1_drum_turns",
              question: "Does the drum turn freely by hand with the machine unplugged?",
              section: "§4.1 Spin test",
              safety: "Unplug the washer before putting a hand inside the drum.",
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
              section: "§4.2 Motor and belt",
              safety: "Keep hands clear of the drum while the machine is powered.",
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
              section: "§4.2",
              proRequired: false,
              advice:
                "Unplug the machine before removing the old belt. Compare the new belt's length with the old one before fitting.",
            },
            jam: {
              diagnosis: "Obstruction or seized bearing (WX-200 Service Manual §4.4)",
              section: "§4.4",
              proRequired: true,
              advice:
                "Clear the obstruction; if the drum still binds, the bearing must be replaced by a pro.",
            },
            interlock: {
              diagnosis: "Lid interlock or supply fault (WX-200 Service Manual §4.1)",
              section: "§4.1",
              proRequired: false,
              advice:
                "Check the lid closes fully and the outlet is live. No part is staged from this branch.",
            },
          },
        },
        {
          id: "wont_start",
          name: "Machine will not start",
          section: "WX-200 Service Manual §2 'Power and interlock'",
          summary: "Checks the supply and lid interlock before any internal electrical work.",
          steps: [
            {
              id: "q1_power",
              question: "Does the control panel light up when you press start?",
              section: "§2.1 Supply check",
              safety: "Do not open the cabinet. Check the outlet with another appliance first.",
              options: [
                {
                  value: "dead",
                  title: "No, the panel is dark",
                  note: "Check supply before the interlock",
                },
                {
                  value: "lit",
                  title: "Yes, the panel lights",
                  note: "Continue to the lid latch check",
                },
              ],
            },
            {
              id: "q2_latch",
              question: "With the panel lit, does the lid latch click shut?",
              section: "§2.2 Lid interlock",
              safety: "Unplug the washer before inspecting the lid strike.",
              options: [
                { value: "no_click", title: "No click", note: "Lid interlock fault" },
                { value: "clicks", title: "It clicks", note: "Refer the control fault to a pro" },
              ],
              requires: "q1_power=lit",
            },
          ],
          resolution: {
            supply: {
              diagnosis: "No supply to the washer (WX-200 Service Manual §2.1)",
              section: "§2.1",
              proRequired: false,
              advice: "Check the outlet and plug first. No part is staged from this branch.",
            },
            interlock: {
              diagnosis: "Lid interlock fault (WX-200 Service Manual §2.2)",
              section: "§2.2",
              proRequired: true,
              advice:
                "Unplug the machine. A failed interlock is a technician job; do not bypass it.",
            },
            control: {
              diagnosis: "Control fault referred to a pro (WX-200 Service Manual §2.3)",
              section: "§2.3",
              proRequired: true,
              advice:
                "No part is staged from this branch. Keep the machine unplugged until inspected.",
            },
          },
        },
        {
          id: "wont_drain",
          name: "Water will not drain",
          section: "WX-200 Service Manual §5 'Drainage'",
          summary: "Works from the accessible filter to the hose, then the drain pump.",
          steps: [
            {
              id: "q1_pump_filter",
              question: "Is the pump filter behind the lower access flap blocked?",
              section: "§5.1 Pump filter",
              safety:
                "Unplug the machine and have a shallow tray ready; remaining water will drain out.",
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
              section: "§5.2 Drain hose",
              safety: "Unplug the washer before moving the hose.",
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
              section: "§5.3",
              proRequired: false,
              advice: "Disconnect power and water before checking the pump impeller.",
            },
            filter: {
              diagnosis: "Blocked pump filter (WX-200 Service Manual §5.1)",
              section: "§5.1",
              proRequired: false,
              advice: "No part needed. Clean the filter and run a short rinse cycle.",
            },
            hose: {
              diagnosis: "Kinked drain hose (WX-200 Service Manual §5.2)",
              section: "§5.2",
              proRequired: false,
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
      sourceAnchor: "#L120-L122",
      symptoms: [
        {
          id: "not_draining",
          name: "Water will not drain",
          section: "DX-100 Owner's Guide §7 'Water and drainage'",
          summary: "Starts with the removable filter, then the hose, then the pump.",
          steps: [
            {
              id: "q1_filter",
              question: "Is the filter at the bottom of the tub blocked with food debris?",
              section: "§7.1 Filter",
              safety: "Unplug the dishwasher before lifting out the filter.",
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
              section: "§7.2 Drain hose",
              safety: "Unplug the dishwasher before moving the hose.",
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
              section: "§7.3",
              proRequired: false,
              advice: "Disconnect power and water before checking the pump impeller.",
            },
            filter: {
              diagnosis: "Blocked filter (DX-100 Guide §7.1)",
              section: "§7.1",
              proRequired: false,
              advice: "No part needed. Clean the filter and run a rinse cycle.",
            },
            hose: {
              diagnosis: "Kinked drain hose (DX-100 Guide §7.2)",
              section: "§7.2",
              proRequired: false,
              advice:
                "No part needed. Straighten the hose; do not push it deeper than 10 cm into the standpipe.",
            },
          },
        },
        {
          id: "not_cleaning",
          name: "Dishes come out dirty",
          section: "DX-100 Owner's Guide §6 'Wash system'",
          summary: "Checks the spray arm and filter before considering a part.",
          steps: [
            {
              id: "q1_spray_arm",
              question: "Do the spray arm holes spin freely and have visible openings?",
              section: "§6.1 Spray arm",
              safety: "Unplug the dishwasher before reaching into the tub.",
              options: [
                { value: "blocked", title: "The holes are blocked", note: "Clean the spray arm" },
                {
                  value: "clear",
                  title: "The arm spins freely",
                  note: "Continue to the filter check",
                },
              ],
            },
            {
              id: "q2_filter",
              question: "Is the tub filter clogged with food debris?",
              section: "§6.2 Filter",
              safety: "Unplug the appliance before removing the filter.",
              options: [
                {
                  value: "clogged",
                  title: "Yes, it is clogged",
                  note: "A filter assembly may be needed",
                },
                { value: "clean", title: "No, it is clean", note: "Refer a wash fault to a pro" },
              ],
              requires: "q1_spray_arm=clear",
            },
          ],
          resolution: {
            spray_arm: {
              diagnosis: "Blocked spray arm (DX-100 Guide §6.1)",
              section: "§6.1",
              proRequired: false,
              advice: "No part needed. Remove the arm, rinse the jets and refit it securely.",
            },
            filter: {
              partId: "filter_09",
              diagnosis: "Damaged filter assembly (DX-100 Guide §6.2)",
              section: "§6.2",
              proRequired: false,
              advice: "Unplug the dishwasher before replacing the filter assembly.",
            },
            wash_fault: {
              diagnosis: "Wash system fault referred to a pro (DX-100 Guide §6.3)",
              section: "§6.3",
              proRequired: true,
              advice: "No part is staged from this branch. A pro must check the wash pump.",
            },
          },
        },
      ],
    },
    {
      id: "fridge_fr400",
      name: "Fridge FR-400",
      manual: "FR-400 Service Guide, §3 'Cooling circuit'",
      sourceAnchor: "#L179-L181",
      symptoms: [
        {
          id: "not_cooling",
          name: "Fridge is not cooling",
          section: "FR-400 Service Guide §3 'Cooling circuit'",
          summary: "Follows coils, fan, thermostat and sealed-system checks in manual order.",
          steps: [
            {
              id: "q1_cleaning",
              question: "When did you last clean the condenser coils at the back?",
              section: "§3.1 Condenser coils",
              safety: "Unplug the fridge before brushing the coils.",
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
              section: "§3.2 Condenser fan",
              safety: "Keep fingers clear of the fan guard and unplug before inspecting.",
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
              section: "§3.3 Thermostat",
              safety: "Do not open the sealed system or probe mains voltage.",
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
              section: "§3.1",
              proRequired: false,
              advice:
                "No part needed. Unplug the fridge and brush the coils gently; allow 24 hours to cool down.",
            },
            fan: {
              partId: "fan_11",
              diagnosis: "Failed condenser fan (FR-400 Guide §3.2)",
              section: "§3.2",
              proRequired: false,
              advice:
                "Unplug before reaching behind the appliance. Clear any ice or debris from the fan guard first.",
            },
            thermostat: {
              partId: "thermostat_22",
              diagnosis: "Failed thermostat (FR-400 Guide §3.3)",
              section: "§3.3",
              proRequired: false,
              advice:
                "Unplug the appliance. If the compressor still never starts, a pro must check the sealed system.",
            },
            sealed: {
              diagnosis: "Possible sealed-system fault (FR-400 Guide §3.4)",
              section: "§3.4",
              proRequired: true,
              advice:
                "No part is staged from this branch: sealed-system work must be done by a qualified pro.",
            },
          },
        },
        {
          id: "not_freezing",
          name: "Freezer is not freezing",
          section: "FR-400 Service Guide §3 'Cooling circuit'",
          summary: "Checks the door seal and evaporator fan before a sealed-system referral.",
          steps: [
            {
              id: "q1_seal",
              question: "Does a sheet of paper stay gripped when closed in the freezer door?",
              section: "§3.5 Door seal",
              safety: "Do not force the door or heat the seal with a tool.",
              options: [
                { value: "loose", title: "No, it pulls out easily", note: "Door seal is suspect" },
                {
                  value: "tight",
                  title: "Yes, it grips",
                  note: "Continue to the evaporator fan check",
                },
              ],
            },
            {
              id: "q2_evap_fan",
              question: "Does the fan inside the freezer run when the door is pressed closed?",
              section: "§3.6 Evaporator fan",
              safety: "Unplug before removing any interior panel.",
              options: [
                { value: "still", title: "No, it stays still", note: "Evaporator fan has failed" },
                {
                  value: "runs",
                  title: "Yes, it runs",
                  note: "Refer a sealed-system check to a pro",
                },
              ],
              requires: "q1_seal=tight",
            },
          ],
          resolution: {
            seal: {
              diagnosis: "Worn freezer door seal (FR-400 Guide §3.5)",
              section: "§3.5",
              proRequired: true,
              advice: "No part is staged from this branch. A pro must fit a new seal.",
            },
            evap_fan: {
              partId: "fan_11",
              diagnosis: "Failed evaporator fan (FR-400 Guide §3.6)",
              section: "§3.6",
              proRequired: false,
              advice: "Unplug the fridge and clear ice from around the fan before replacing it.",
            },
            sealed: {
              diagnosis: "Possible sealed-system fault (FR-400 Guide §3.4)",
              section: "§3.4",
              proRequired: true,
              advice:
                "No part is staged from this branch: sealed-system work needs a qualified pro.",
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
  // Kept in sync with peers/localpros/catalogue.js so peer slot ids are
  // always accepted by website_book_repair.
  slots: [
    { id: "slot_am", label: "Morning visit 09:00-12:00", price: 65 },
    { id: "slot_pm", label: "Afternoon visit 13:00-16:00", price: 55 },
    { id: "slot_early", label: "Early visit 08:00-11:00", price: 70 },
    { id: "slot_evening", label: "Evening visit 17:00-20:00", price: 75 },
  ],
};
