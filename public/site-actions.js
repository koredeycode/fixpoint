// Registers Fixpoint's own operations with the agent runtime.
// Loaded by the manifest's actions.module. Every execute() wraps a function in
// store.js — the same functions the React pages call. No business rules here.

import { App } from "./store.js";

class SiteActions {
  static registerActions(actions) {
    actions.register(SiteActions.manualIndex());
    actions.register(SiteActions.symptomTree());
    actions.register(SiteActions.kit());
    actions.register(SiteActions.addPart());
    actions.register(SiteActions.bookRepair());
  }

  static manualIndex() {
    return {
      name: "get_manual_index",
      description:
        "Read the list of appliances and symptom topics in the Fixpoint manual library. Call this before any diagnosis.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getManualIndex(),
    };
  }

  static symptomTree() {
    return {
      name: "get_symptom_tree",
      description:
        "Read the real diagnostic decision tree for one appliance and symptom. Returns ordered questions with option values, plus the resolution and part each branch resolves to. Ground every question in this result.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["appliance", "symptom"],
        properties: {
          appliance: { type: "string", enum: App.page.applianceIds() },
          symptom: { type: "string", enum: App.page.symptomIds() },
        },
      },
      execute: (args) => App.page.getSymptomTree(args.appliance, args.symptom),
    };
  }

  static kit() {
    return {
      name: "get_kit",
      description:
        "Read the visitor's current repair kit: staged parts, quantities, total and its version. Call in the same turn as book_repair to get the current version.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.getKit(),
    };
  }

  static addPart() {
    return {
      name: "add_part_to_kit",
      description:
        "Stage a part from website_get_symptom_tree in the visitor's visible repair kit. Uses a part id from that result or website_get_manual_index. Undoable on the page. Does not book anything.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["partId", "quantity"],
        properties: {
          partId: { type: "string", enum: App.page.partIds() },
          quantity: { type: "integer", minimum: 1, maximum: 20 },
        },
      },
      execute: (args) => App.page.addPartToKit(args.partId, args.quantity),
    };
  }

  static bookRepair() {
    return {
      name: "book_repair",
      description:
        "Book a repair pro for the current kit. Call only after a part is staged and a slot is known. In this turn, first call website_get_kit and wait for its result to get the current version. The browser asks the visitor to confirm. The site refuses a stale expectedVersion. Returns the receipt.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["slotId", "expectedVersion"],
        properties: {
          slotId: { type: "string", description: "The slot id shown by the repair pro." },
          expectedVersion: {
            type: "integer",
            minimum: 0,
            description: "The version from website_get_kit in this turn.",
          },
        },
      },
      execute: (args) => App.page.bookRepair(args),
    };
  }
}

export const registerActions = SiteActions.registerActions;
