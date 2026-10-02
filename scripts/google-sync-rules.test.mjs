import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
const sharedSource = readFileSync(new URL('../functions/src/shared/googleSharedSync.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(sharedSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const server = { exports: {} }; vm.runInNewContext(compiled, server);
const clientSource = readFileSync(new URL('../src/utils/googleSharedSync.ts', import.meta.url), 'utf8');
const client = { exports: {}, require: () => server.exports };
vm.runInNewContext(ts.transpileModule(clientSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, client);
const calendar = 'fixture@group.calendar.google.com';
test('server and client reuse the existing stable document identity', () => {
  const id = server.exports.stableGoogleImportId(calendar, 'event_1');
  assert.equal(id, 'gshared-b044e7e883bea340');
  assert.equal(client.exports.stableGoogleImportId(calendar, 'event_1'), id);
  assert.notEqual(server.exports.stableGoogleImportId(calendar, 'event_2'), id);
});
test('only exact dedicated shared calendar identifiers are eligible', () => {
  const event = {calendarType:'shared',sharedGoogleCalendarId:calendar,sharedGoogleEventId:'event_1'};
  assert.equal(client.exports.isRealGoogleSharedEvent(event, calendar), true);
  for (const input of [{...event,calendarType:'rebecca'}, {...event,sharedGoogleCalendarId:'other@group.calendar.google.com'},
    {...event,sharedGoogleCalendarId:'primary'}, {...event,sharedGoogleEventId:null}]) {
    assert.equal(server.exports.isRealGoogleSharedEvent(input, calendar), false);
  }
  for (const id of ['primary','person@gmail.com','Shared calendar','@group.calendar.google.com','']) {
    assert.equal(server.exports.isDedicatedSharedCalendarId(id), false);
  }
  assert.equal(client.exports.googleSharedEventKey(event), `${calendar}:event_1`);
});
test('Tokyo year boundary is identical regardless of server or device timezone', () => {
  const code = compiled + `;console.log(JSON.stringify(Object.fromEntries(Object.entries(exports.syncWindow(new Date('2026-12-31T15:30:00Z'))).map(([k,v])=>[k,v.toISOString()]))));`;
  for (const timezone of ['UTC','Asia/Tokyo','America/Los_Angeles']) {
    const result = spawnSync(process.execPath, ['-e',code], { encoding:'utf8', env:{...process.env,TZ:timezone} });
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {from:'2026-12-31T15:00:00.000Z',to:'2027-12-31T15:30:00.000Z'});
  }
});
test('stale diagnostics never select private events or mutate existing documents', () => {
  const events = [
    {appEventId:'linked',calendarType:'shared',sharedGoogleCalendarId:calendar,sharedGoogleEventId:'known',start:'2026-10-01',end:'2026-10-02'},
    {appEventId:'private',calendarType:'rebecca',googleCalendarId:calendar,googleEventId:'private',start:'2026-10-01',end:'2026-10-02'},
  ];
  const before = JSON.stringify(events);
  const result = client.exports.staleGoogleSharedEventIds({localEvents:events,incomingEvents:[events[0]],googleCalendarId:calendar,now:new Date('2026-10-02T00:00:00Z')});
  assert.equal(result.length,0);
  assert.equal(JSON.stringify(events),before);
});
