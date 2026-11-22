// The reads Fixpoint shares with other agent sites.
// Peers run our network in their visitor's browser and get ONLY these actions.
// Never put personal data, keys, or writes in a peer-shared action.
//
// The runtime's action bridge loads this module and requires a `registerActions`
// export; it calls it with the registry facade. Keep the definitions here and
// wrap the site's own functions from store.js.

import { App } from "../store.js";

const BRIDGE_ACTIONS = [
  {
    name: "get_manual_index",
    description: "List the appliances and symptom topics Fixpoint can diagnose.",
    effect: "read",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: () => App.page.getManualIndex(),
  },
  {
    name: "get_symptom_tree",
    description: "Read the grounded diagnostic tree for an appliance and symptom.",
    effect: "read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["appliance", "symptom"],
      properties: {
        appliance: { type: "string" },
        symptom: { type: "string" },
      },
    },
    execute: (args) => App.page.getSymptomTree(args.appliance, args.symptom),
  },
];

export function registerActions(actions) {
  for (const definition of BRIDGE_ACTIONS) actions.register(definition);
}

export { App };
