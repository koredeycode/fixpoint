// The Local Repair Pros site's own operation, registered with the agent runtime.
// Loaded by the manifest's actions.module. It is a pure read over catalogue.js.

import { filterSlots } from "./catalogue.js";

const AVAILABLE_SLOTS = {
  name: "available_slots",
  description:
    "List the repair slots Local Repair Pros offers, with each slot's id, label and exact price. Pass a date (or date prefix) to filter; omit it to get all slots.",
  effect: "read",
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
