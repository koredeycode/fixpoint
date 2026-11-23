// SpareParts Co's own read-only action, registered with the agent runtime.
// Loaded by the manifest's actions.module. All data comes from catalogue.js.

import { CATALOGUE } from "./catalogue.js";

function checkStock(args) {
  const partId = args?.partId;
  const item = CATALOGUE[partId];
  if (!item) return { ok: false, reason: `Unknown part id: ${partId}` };
  return { ok: true, partId, inStock: item.inStock, price: item.price, eta: item.eta };
}

const ACTIONS = [
  {
    name: "check_stock",
    description:
      "Look up the current stock, price and estimated arrival for a spare part by its id.",
    effect: "read",
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
  for (const definition of ACTIONS) actions.register(definition);
}
