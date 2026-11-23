// Local, read-only spare-parts catalogue for the SpareParts Co peer.
// Both site-actions.js and bridge/bridge-actions.js import this data so the
// agent and the action bridge always report identical stock, price and ETA.

export const CATALOGUE = {
  belt_42: { inStock: true, price: 18.5, eta: "in stock — ships today" },
  pump_17: { inStock: false, price: 74.0, eta: "5-7 business days" },
  filter_09: { inStock: true, price: 12.75, eta: "in stock — ships today" },
  fan_11: { inStock: true, price: 39.99, eta: "2-3 business days" },
  thermostat_22: { inStock: false, price: 56.25, eta: "7-10 business days" },
};
