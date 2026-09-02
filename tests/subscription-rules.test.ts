import assert from "node:assert/strict";
import test from "node:test";
import { addMonths, isValidSubscriptionDuration, validateSubscriptionPrice } from "../src/lib/subscription-rules";

test("Basic and Pro only accept configured 6/12 month durations", () => {
  assert.equal(isValidSubscriptionDuration("BASIC", 6), true);
  assert.equal(isValidSubscriptionDuration("PRO", 12), true);
  assert.equal(isValidSubscriptionDuration("BASIC", 1), false);
  assert.equal(isValidSubscriptionDuration("PRO", 36), false);
});

test("Custom plans accept 1-36 months", () => {
  assert.equal(isValidSubscriptionDuration("CUSTOM", 1), true);
  assert.equal(isValidSubscriptionDuration("CUSTOM", 36), true);
  assert.equal(isValidSubscriptionDuration("CUSTOM", 37), false);
});

test("configured pricing never falls back to an old subscription price", () => {
  assert.equal(validateSubscriptionPrice("PRO", 6), 5999);
  assert.equal(validateSubscriptionPrice("PRO", 12), 7999);
  assert.equal(validateSubscriptionPrice("PRO", 1), null);
  assert.equal(validateSubscriptionPrice("CUSTOM", 12, 2500), 2500);
  assert.equal(validateSubscriptionPrice("CUSTOM", 12, 0), null);
});

test("addMonths preserves calendar-month semantics", () => {
  assert.equal(addMonths(new Date("2026-01-15T00:00:00.000Z"), 6).toISOString(), "2026-07-15T00:00:00.000Z");
});
