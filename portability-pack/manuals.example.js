// Tiny example dataset for the Portability Pack. It matches the MANUALS_DATA shape used
// by the diagnostic network: appliances -> symptoms -> steps (options + requires) ->
// resolution -> parts -> slots. Replace every value with YOUR OWN grounded, licensed
// data before shipping: keep the shape and stable ids, give every diagnosis a real
// source section, make each resolution.partId match a parts[].id, and never invent
// facts in the agent instructions. See diagnostic-network.hocon metadata.source and
// the README in this folder. This is an illustration, not real product data.

export const MANUALS_DATA = {
  appliances: [
    {
      id: "widget_w1",
      name: "Widget W-1",
      manual: "W-1 Service Guide, §2 'Heating system'",
      symptoms: [
        {
          id: "not_heating",
          name: "Will not heat up",
          steps: [
            {
              id: "q1_power",
              question: "With the unit unplugged, is the power cord undamaged?",
              options: [
                {
                  value: "damaged",
                  title: "No, it is damaged",
                  note: "Cord must be replaced by a pro",
                },
                { value: "ok", title: "Yes, it looks fine", note: "Continue to the element check" },
              ],
            },
            {
              id: "q2_element",
              question: "Does the heating element show visible damage?",
              options: [
                {
                  value: "damaged",
                  title: "Yes, it is burned or cracked",
                  note: "Element has failed",
                },
                { value: "fine", title: "No, it looks intact", note: "Thermostat may have failed" },
              ],
              requires: "q1_power=ok",
            },
          ],
          resolution: {
            element: {
              partId: "heat_10",
              diagnosis: "Failed heating element (W-1 Service Guide §2.2)",
              advice: "Unplug the unit before touching the element.",
            },
            thermostat: {
              partId: "therm_20",
              diagnosis: "Failed thermostat (W-1 Service Guide §2.3)",
              advice: "Unplug the unit; if it still will not heat, a pro must inspect it.",
            },
            cord: {
              diagnosis: "Damaged power cord (W-1 Service Guide §2.1)",
              advice: "No part staged from this branch: cord replacement must be done by a pro.",
            },
          },
        },
      ],
    },
  ],
  parts: [
    { id: "heat_10", name: "HEAT-10 Heating element", price: 20.0, fits: ["widget_w1"] },
    { id: "therm_20", name: "THERM-20 Thermostat", price: 15.0, fits: ["widget_w1"] },
  ],
  slots: [{ id: "slot_am", label: "Tomorrow, 09:00-12:00", price: 50 }],
};
