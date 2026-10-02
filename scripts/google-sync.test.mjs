import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/hooks/useGoogleSharedCalendarSync.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup(fail) {
  let effect;
  let calls = 0;
  let errors = 0;
  let successes = 0;
  const listeners = new Map();
  const target = { addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); }, visibilityState: 'visible' };
  const services = { backendName: 'firebase', settingsRepo: { getAppConfig: () => ({ googleSharedCalendarId: 'dedicated@group.calendar.google.com' }) },
    auth: { isGoogleCalendarConnected: () => true },
    calendar: { listGoogleSharedEvents() { assert.fail('browser fallback must not import Google events'); } },
    eventsRepo: { getAllRaw() { assert.fail('sync must not migrate existing documents'); }, upsert() { assert.fail('browser must not write imported events'); } } };
  const modules = {
    react: { useEffect: callback => { effect = callback; } },
    'firebase/functions': { httpsCallable: () => async () => { calls++; if (fail) throw new Error('server unavailable'); return { data: { imported: 1 } }; } },
    '@/config/appConfig': { APP_CONFIG: {} }, '@/services/container': { services },
    '@/services/firebase/firebaseApp': { firebaseFunctions: () => ({}) },
    '@/utils/sharedGoogleSyncStatus': { markSharedGoogleSyncError() { errors++; }, markSharedGoogleSyncOk() { successes++; },
      markSharedGoogleSyncStarted() {}, SHARED_GOOGLE_SYNC_REQUEST_EVENT: 'request-sync' },
  };
  const sandbox = { exports: {}, require: name => modules[name],
    window: { ...target, setInterval: () => 1, clearInterval() {} }, document: target };
  vm.runInNewContext(compiled, sandbox);
  sandbox.exports.useGoogleSharedCalendarSync({ userId: 'fixture', role: 'partner' });
  const cleanup = effect();
  return { listeners, cleanup, result: () => ({ calls, errors, successes }) };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('successful sync uses the server writer and keeps local import paths unused', async () => {
  const fixture = setup(false);
  await settle();
  assert.deepEqual(fixture.result(), { calls: 1, errors: 0, successes: 1 });
  fixture.cleanup();
  assert.equal(fixture.listeners.size, 0);
});
test('server failure preserves local documents and online recovery retries the server', async () => {
  const fixture = setup(true);
  await settle();
  assert.deepEqual(fixture.result(), { calls: 1, errors: 1, successes: 0 });
  fixture.listeners.get('online')();
  await settle();
  assert.deepEqual(fixture.result(), { calls: 2, errors: 2, successes: 0 });
  fixture.cleanup();
});
