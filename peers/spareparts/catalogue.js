// Local, read-only spare-parts catalogue for the SpareParts Co peer.
// Both site-actions.js and bridge/bridge-actions.js import this data so the
// agent and the action bridge always report identical stock, price and ETA.
// PRICES ARE AUTHORITATIVE and must match public/data/manuals.js: the receipt
// is built by Fixpoint from its own catalogue, not from this peer quote.

export const CATALOGUE = {
  belt_42: { inStock: true, price: 18.0, eta: "in stock — ships today" },
  pump_17: { inStock: false, price: 47.5, eta: "5-7 business days" },
  filter_09: { inStock: true, price: 12.0, eta: "in stock — ships today" },
  fan_11: { inStock: true, price: 24.0, eta: "2-3 business days" },
  thermostat_22: { inStock: false, price: 32.0, eta: "7-10 business days" },
};
