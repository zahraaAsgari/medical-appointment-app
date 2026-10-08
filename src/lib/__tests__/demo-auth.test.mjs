/**
 * Tests for the demo-auth gate in POST /api/auth/telegram.
 *
 * The gate must be secure by default: any value other than an explicit
 * "true" (case/whitespace tolerant) keeps anonymous login closed.
 *
 * Run with: node --test src/lib/__tests__/demo-auth.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors the exact expression in src/app/api/auth/telegram/route.ts:
 *   const allowDemo = (process.env.ALLOW_DEMO_AUTH ?? "").trim().toLowerCase() === "true";
 */
function allowDemoFor(rawValue) {
  const saved = process.env.ALLOW_DEMO_AUTH;
  if (rawValue === undefined) delete process.env.ALLOW_DEMO_AUTH;
  else process.env.ALLOW_DEMO_AUTH = rawValue;
  try {
    return (process.env.ALLOW_DEMO_AUTH ?? "").trim().toLowerCase() === "true";
  } finally {
    if (saved === undefined) delete process.env.ALLOW_DEMO_AUTH;
    else process.env.ALLOW_DEMO_AUTH = saved;
  }
}

test("demo auth DISABLED when ALLOW_DEMO_AUTH is unset (secure default)", () => {
  assert.equal(allowDemoFor(undefined), false);
});

test("demo auth DISABLED for exact 'false'", () => {
  assert.equal(allowDemoFor("false"), false);
});

test("demo auth DISABLED for 'False' (capitalised)", () => {
  assert.equal(allowDemoFor("False"), false);
});

test("demo auth DISABLED for 'FALSE' (uppercase)", () => {
  assert.equal(allowDemoFor("FALSE"), false);
});

test("demo auth DISABLED for 'false ' (trailing whitespace)", () => {
  assert.equal(allowDemoFor("false "), false);
});

test("demo auth DISABLED for ' false' (leading whitespace)", () => {
  assert.equal(allowDemoFor(" false"), false);
});

test("demo auth DISABLED for '0'", () => {
  assert.equal(allowDemoFor("0"), false);
});

test("demo auth DISABLED for 'no'", () => {
  assert.equal(allowDemoFor("no"), false);
});

test("demo auth DISABLED for 'off'", () => {
  assert.equal(allowDemoFor("off"), false);
});

test("demo auth DISABLED for empty string", () => {
  assert.equal(allowDemoFor(""), false);
});

test("demo auth ENABLED only for explicit 'true'", () => {
  assert.equal(allowDemoFor("true"), true);
});

test("demo auth ENABLED for 'True' / 'TRUE' (explicit opt-in, any case)", () => {
  assert.equal(allowDemoFor("True"), true);
  assert.equal(allowDemoFor("TRUE"), true);
});

test("demo auth ENABLED for ' true ' (explicit opt-in with whitespace)", () => {
  assert.equal(allowDemoFor(" true "), true);
});

test("demo auth DISABLED for a stray token-like value", () => {
  assert.equal(allowDemoFor("yes-but-accidentally-pasted"), false);
});
