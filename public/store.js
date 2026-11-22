// The single source of truth for Fixpoint.
// Plain ES module (no framework) because the browser runtime loads site-actions.js
// by URL from public/. React reads the same instance through window.__FIXPOINT__.
// Import URL must match in every consumer: "./store.js" / "/store.js" (no query strings).

import { MANUALS_DATA } from "./data/manuals.js";

// Stable deep links: #<appliance>--<symptom>, independent of dataset line numbers.
const SITE_BASE =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : MANUALS_DATA.sourceUrl || "https://askfixpoint.vercel.app/";
const sourceLink = (applianceId, symptomId) =>
  `${SITE_BASE.replace(/\/$/, "")}/#${applianceId}${symptomId ? `--${symptomId}` : ""}`;

const state = {
  appliances: MANUALS_DATA.appliances,
  parts: MANUALS_DATA.parts,
  slots: MANUALS_DATA.slots,
  kit: { items: [], version: 0 },
  booking: null,
  selected: {
    applianceId: MANUALS_DATA.appliances[0]?.id ?? null,
    symptomId: MANUALS_DATA.appliances[0]?.symptoms[0]?.id ?? null,
  },
};

const listeners = new Set();

function snapshot(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function emit() {
  for (const listener of listeners) listener();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fixpoint:state", { detail: snapshot(state) }));
  }
}

export const App = {
  page: {
    // ---- reads -------------------------------------------------------------
    getState() {
      return snapshot(state);
    },

    getManualIndex() {
      return {
        ok: true,
        sourceUrl: sourceLink("manual_library"),
        slots: snapshot(state.slots),
        appliances: state.appliances.map((a) => ({
          id: a.id,
          name: a.name,
          manual: a.manual,
          sourceUrl: sourceLink(a.id),
          symptoms: a.symptoms.map((s) => ({
            id: s.id,
            name: s.name,
            sourceUrl: sourceLink(a.id, s.id),
          })),
        })),
      };
    },

    applianceIds() {
      return state.appliances.map((a) => a.id);
    },

    symptomIds() {
      return [...new Set(state.appliances.flatMap((a) => a.symptoms.map((s) => s.id)))];
    },

    partIds() {
      return state.parts.map((p) => p.id);
    },

    setSelectedSymptom(applianceId, symptomId) {
      const appliance = state.appliances.find((a) => a.id === applianceId);
      if (!appliance?.symptoms.some((s) => s.id === symptomId)) {
        return { ok: false, reason: "Unknown symptom." };
      }
      state.selected = { applianceId, symptomId };
      emit();
      return { ok: true, selected: snapshot(state.selected) };
    },

    getSymptomTree(applianceId, symptomId) {
      const appliance = state.appliances.find((a) => a.id === applianceId);
      const symptom = appliance?.symptoms.find((s) => s.id === symptomId);
      if (!symptom) {
        return { ok: false, reason: "No manual entry for that appliance and symptom." };
      }
      return {
        ok: true,
        appliance: appliance.name,
        manual: appliance.manual,
        sourceUrl: sourceLink(appliance.id, symptom.id),
        symptom: symptom.name,
        steps: snapshot(symptom.steps),
        resolution: snapshot(symptom.resolution),
        source: `public/data/manuals.js#${applianceId}.${symptomId}`,
      };
    },

    getKit() {
      const total = state.kit.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      return { ok: true, items: snapshot(state.kit.items), version: state.kit.version, total };
    },

    // ---- undoable write ----------------------------------------------------
    addPartToKit(partId, quantity) {
      const part = state.parts.find((p) => p.id === partId);
      if (!part) return { ok: false, reason: "Unknown part id." };
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return {
          ok: false,
          reason: "Quantity must be a whole number between 1 and 20.",
          field: "quantity",
        };
      }
      const existing = state.kit.items.find((i) => i.partId === partId);
      if (existing) existing.quantity += quantity;
      else state.kit.items.push({ partId, name: part.name, quantity, unitPrice: part.price });
      state.kit.version += 1;
      emit();
      return { ok: true, kit: snapshot(state.kit) };
    },

    clearKit() {
      state.kit.items = [];
      state.kit.version += 1;
      emit();
      return { ok: true, kit: snapshot(state.kit) };
    },

    // Test/demo helper: restore the initial state deterministically.
    resetState() {
      state.kit = { items: [], version: 0 };
      state.booking = null;
      state.selected = {
        applianceId: MANUALS_DATA.appliances[0]?.id ?? null,
        symptomId: MANUALS_DATA.appliances[0]?.symptoms[0]?.id ?? null,
      };
      emit();
      return { ok: true };
    },

    // ---- irreversible (dialog-gated) --------------------------------------
    checkBooking({ slotId, expectedVersion }) {
      if (expectedVersion !== state.kit.version) {
        return {
          ok: false,
          reason: "The kit changed since you looked at it. Review the page and try again.",
        };
      }
      if (!state.kit.items.length) {
        return { ok: false, reason: "There are no parts in the kit to book." };
      }
      const slot = state.slots.find((s) => s.id === slotId);
      if (!slot) return { ok: false, reason: "That slot is no longer available." };
      const partsTotal = state.kit.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      return {
        ok: true,
        slot: slot.label,
        items: state.kit.items.length,
        partsTotal,
        total: partsTotal + slot.price,
      };
    },

    bookRepair({ slotId, expectedVersion }) {
      const check = App.page.checkBooking({ slotId, expectedVersion });
      if (!check.ok) return check;
      state.booking = {
        confirmation: `FP-${1000 + state.kit.version}`,
        slot: check.slot,
        items: check.items,
        total: check.total,
      };
      emit();
      return { ok: true, receipt: snapshot(state.booking) };
    },
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Framework bridge. store.js is loaded before React from index.html, so this is
// ready synchronously when the first React component renders.
if (typeof window !== "undefined") {
  window.__FIXPOINT__ = {
    getState: () => App.page.getState(),
    subscribe: (listener) => App.subscribe(listener),
    page: App.page,
  };
  window.dispatchEvent(new CustomEvent("fixpoint:ready"));
}
