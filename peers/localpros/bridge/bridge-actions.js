// The one read this peer shares with calling agent sites.
// Peers run our network in their visitor's browser and get ONLY this action.
// It mirrors site-actions.js but reads directly from ../catalogue.js so the
// bridge has no dependency on the site's own module graph.

import { filterSlots } from "../catalogue.js";

const AVAILABLE_SLOTS = {
  name: "available_slots",
  description:
    "List the repair slots Local Repair Pros offers, with each slot's id, label and exact price. Pass a date (or date prefix) to filter; omit it to get all slots.",
  effect: "read",
  callerOrigins: ["*"],
  inputSchema: {
    type: "object",
    properties: {
      date: { type: "string" },
    },
    additionalProperties: false,
  },
  execute: (args = {}) => {
    const date = args && typeof args.date === "string" ? args.date : undefined;
    const slots = filterSlots(date).map(({ id, label, price }) => ({ id, label, price }));
    return { ok: true, slots };
  },
};

export function registerActions(actions) {
  actions.register(AVAILABLE_SLOTS);
}
