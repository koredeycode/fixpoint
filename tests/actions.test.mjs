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
