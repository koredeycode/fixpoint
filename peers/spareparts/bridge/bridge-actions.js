// The action Fixpoint shares with other agent sites when it calls us as a peer.
// Peers run our network in their visitor's browser and get ONLY this action.
// The runtime's action bridge loads this module and requires a `registerActions`
// export; it calls it with the registry facade. Data comes from ../catalogue.js,
// the same source site-actions.js uses, so the two registrations stay identical.

import { CATALOGUE } from "../catalogue.js";

function checkStock(args) {
  const partId = args?.partId;
  const item = CATALOGUE[partId];
  if (!item) return { ok: false, reason: `Unknown part id: ${partId}` };
  return { ok: true, partId, inStock: item.inStock, price: item.price, eta: item.eta };
}

const BRIDGE_ACTIONS = [
  {
    name: "check_stock",
    description:
      "Look up the current stock, price and estimated arrival for a spare part by its id.",
    effect: "read",
    callerOrigins: ["*"],
    inputSchema: {
      type: "object",
      required: ["partId"],
      properties: { partId: { type: "string" } },
      additionalProperties: false,
    },
    execute: checkStock,
  },
];

export function registerActions(actions) {
  for (const definition of BRIDGE_ACTIONS) actions.register(definition);
}
