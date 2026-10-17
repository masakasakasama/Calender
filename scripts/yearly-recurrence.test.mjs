import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/yearlyRecurrence.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context);
const { expandYearlyEvents, inYear } = context.exports;
const event = (overrides = {}) => ({
  appEventId: 'june-birthday', title: 'Birthday',
  start: '2026-06-15T15:00:00.000Z', end: '2026-06-16T15:00:00.000Z',
  allDay: true, recurrence: { frequency: 'yearly', count: 1 },
  recurrenceParentId: 'birthday-series', deletedAt: null,
  googleEventId: 'google_20260616', sourceGoogleEventId: null, sharedGoogleEventId: null,
  ...overrides,
});

test('birthdays continue indefinitely, preserving the source and duration', () => {
  const source = event();
  const before = JSON.stringify(source);
  const result = expandYearlyEvents([source], 2049, 2050);
  assert.equal(result.length, 2);
  assert.equal(result[0].start, '2049-06-15T15:00:00.000Z');
  assert.equal(result[1].end, '2050-06-16T15:00:00.000Z');
  assert.equal(result[0].appEventId, source.appEventId);
  assert.notEqual(result[0].googleEventId, result[1].googleEventId);
  assert.equal(JSON.stringify(source), before);
});

test('existing 2026 and 2027 copies produce exactly one occurrence per year', () => {
  const result = expandYearlyEvents([event(), event({
    appEventId: 'existing-2027', start: '2027-06-15T15:00:00.000Z', end: '2027-06-16T15:00:00.000Z',
  })], 2026, 2028);
  assert.equal(result.length, 3);
  assert.equal(result[1].appEventId, 'existing-2027');
  assert.equal(result[2].appEventId, 'june-birthday');
});

test('deleted birthdays are never expanded; unrelated events remain unchanged', () => {
  const ordinary = event({ appEventId: 'one-off', recurrence: null });
  const result = expandYearlyEvents([event({ deletedAt: '2026-07-01' }), ordinary], 2027, 2029);
  assert.equal(result.length, 1);
  assert.equal(result[0], ordinary);
  assert.equal(expandYearlyEvents([event()], 2020, 2025).length, 0);
});

test('February 29 maps to February 28 and recovers on the next leap year', () => {
  // Use local noon so this test also works in the CI timezone.
  const leap = new Date(2024, 1, 29, 12).toISOString();
  const common = new Date(inYear(leap, 2025));
  assert.equal(common.getMonth(), 1);
  assert.equal(common.getDate(), 28);
  assert.equal(new Date(inYear(leap, 2028)).getDate(), 29);
});
