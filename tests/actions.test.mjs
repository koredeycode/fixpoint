import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { App } from "../public/store.js";

beforeEach(() => {
  App.page.resetState();
});

test("getManualIndex returns only grounded appliances", () => {
  const result = App.page.getManualIndex();
  assert.equal(result.ok, true);
  assert.ok(result.appliances.length >= 2);
  assert.ok(result.appliances.every((a) => a.id && a.manual));
});

test("getSymptomTree refuses an unknown appliance or symptom", () => {
  const result = App.page.getSymptomTree("nope", "nope");
  assert.equal(result.ok, false);
  assert.match(result.reason, /No manual entry/);
});

test("getSymptomTree returns steps and resolution with a source", () => {
  const result = App.page.getSymptomTree("washer_wx200", "wont_spin");
  assert.equal(result.ok, true);
  assert.ok(result.steps.length > 0);
  assert.ok(result.resolution.belt.partId);
  assert.match(result.source, /manuals\.js/);
});

test("addPartToKit refuses an unknown part and a bad quantity", () => {
  assert.equal(App.page.addPartToKit("not-a-part", 1).ok, false);
  assert.equal(App.page.addPartToKit("belt_42", 0).ok, false);
  assert.equal(App.page.addPartToKit("belt_42", 21).ok, false);
});

test("addPartToKit increments the kit version and is undoable", () => {
  const first = App.page.addPartToKit("belt_42", 1);
  assert.equal(first.ok, true);
  assert.equal(first.kit.version, 1);
  const second = App.page.addPartToKit("belt_42", 2);
  assert.equal(second.kit.items[0].quantity, 3);
  assert.equal(second.kit.version, 2);
  App.page.clearKit();
  assert.equal(App.page.getKit().items.length, 0);
});

test("bookRepair refuses a stale expectedVersion", () => {
  App.page.addPartToKit("belt_42", 1);
  const result = App.page.bookRepair({ slotId: "slot_am", expectedVersion: 0 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /changed/i);
});

test("bookRepair returns a receipt with the total", () => {
  App.page.addPartToKit("belt_42", 1);
  const version = App.page.getKit().version;
  const result = App.page.bookRepair({ slotId: "slot_am", expectedVersion: version });
  assert.equal(result.ok, true);
  assert.match(result.receipt.confirmation, /^FP-/);
  assert.equal(result.receipt.total, 83);
});

test("manual index exposes the dataset version and the new grounded symptoms", () => {
  const result = App.page.getManualIndex();
  assert.equal(result.datasetVersion, "0.2.0");
  const washer = result.appliances.find((a) => a.id === "washer_wx200");
  assert.ok(washer.symptoms.some((s) => s.id === "wont_start"));
  const dishwasher = result.appliances.find((a) => a.id === "dishwasher_dx100");
  assert.ok(dishwasher.symptoms.some((s) => s.id === "not_cleaning"));
  const fridge = result.appliances.find((a) => a.id === "fridge_fr400");
  assert.ok(fridge.symptoms.some((s) => s.id === "not_freezing"));
});

test("new symptom trees carry sections, safety notes and technician-only flags", () => {
  const tree = App.page.getSymptomTree("washer_wx200", "wont_start");
  assert.equal(tree.ok, true);
  assert.match(tree.section, /§2/);
  assert.ok(tree.summary);
  assert.ok(tree.steps.every((step) => step.section && step.safety));
  assert.equal(tree.resolution.interlock.proRequired, true);
  assert.equal(tree.resolution.supply.proRequired, false);

  const cleaning = App.page.getSymptomTree("dishwasher_dx100", "not_cleaning");
  assert.equal(cleaning.resolution.filter.partId, "filter_09");
  assert.equal(cleaning.resolution.spray_arm.proRequired, false);
});

test("dataset 0.2.0 keeps every 0.1.0 part id, price and slot id", () => {
  assert.deepEqual(App.page.partIds(), [
    "belt_42",
    "pump_17",
    "filter_09",
    "fan_11",
    "thermostat_22",
  ]);
  const parts = App.page.getState().parts;
  assert.deepEqual(
    parts.map((p) => p.price),
    [18, 47.5, 12, 24, 32],
  );
  assert.deepEqual(
    App.page.getState().slots.map((s) => s.id),
    ["slot_am", "slot_pm", "slot_early", "slot_evening"],
  );
});
