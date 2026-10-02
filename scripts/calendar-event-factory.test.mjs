import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../functions/src/shared/calendarEventFactory.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const server = { exports: {} }; vm.runInNewContext(compiled, server);
const browser = { exports: {}, require: () => server.exports };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/calendarEventFactory.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, browser);
const seed = { appEventId:'existing-id', title:'映画', calendarType:'shared', syncStatus:'synced', start:'2026-10-02T15:00:00Z',end:'2026-10-02T16:00:00Z' };
test('browser/server construction agrees and defaults ideas separately', () => {
  for (const factory of [server.exports.createCalendarEvent,browser.exports.createCalendarEvent]) {
    const event = factory(seed);
    assert.equal(event.allDay,false);assert.equal(event.syncError,null);assert.equal(event.emoji,'🎬');
    assert.equal(factory({...seed,calendarType:'plan_idea'}).emoji,'💡');
    assert.equal(factory({...seed,title:'unknown'}).emoji,'📌');
    assert.equal(JSON.stringify(seed).includes('allDay'),false);
    assert.throws(()=>factory({...seed,appEventId:'  '}),/appEventId/);
  }
});
test('factory preserves identities, tombstones, private visibility, explicit emoji and errors', () => {
  for (const emoji of [null,'','⭐']) {
    const input={...seed,calendarType:'rebecca_source',allDay:true,emoji,syncStatus:'error',syncError:'offline',visibility:'private',deletedAt:'2026-10-01',version:4};
    assert.equal(JSON.stringify(server.exports.createCalendarEvent(input)),JSON.stringify(input));
  }
});
test('Google date-only exclusive range is Tokyo midnight in every runtime timezone', () => {
  const code=compiled+`;console.log(JSON.stringify(exports.googleEventTimes({date:'2026-10-02'},{date:'2026-10-03'},'fallback')));`;
  // Avoid host-local date constructors in both server and browser paths.
  for (const TZ of ['UTC','Asia/Tokyo','America/Los_Angeles']) {
    const result=spawnSync(process.execPath,['-e',code],{encoding:'utf8',env:{...process.env,TZ}});
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(JSON.parse(result.stdout),{start:'2026-10-01T15:00:00.000Z',end:'2026-10-02T15:00:00.000Z',allDay:true});
  }
});
test('timed offsets and missing dates preserve explicit caller fallback', () => {
  const result=server.exports.googleEventTimes({dateTime:'2026-10-02T12:00:00-07:00'},undefined,'fixture-now');
  assert.equal(result.start,'2026-10-02T19:00:00.000Z');assert.equal(result.end,'fixture-now');assert.equal(result.allDay,false);
});
