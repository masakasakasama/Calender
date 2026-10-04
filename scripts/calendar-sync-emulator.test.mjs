import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const host = process.env.FIRESTORE_EMULATOR_HOST;

test('shared sync preserves events against faults and excludes private calendars (Firestore Emulator)', { skip: !host }, async () => {
  // Refuse production or remote endpoints even if a caller supplies credentials.
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  assert.match(process.env.GCLOUD_PROJECT || '', /^demo-/);
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  const { GoogleAuth } = require('google-auth-library');
  const { WriteBatch } = require('@google-cloud/firestore');
  const calendar = 'fixture@group.calendar.google.com';
  process.env.GOOGLE_SHARED_CALENDAR_ID = calendar;
  const originalClient = GoogleAuth.prototype.getClient;
  const originalFetch = globalThis.fetch;
  const originalCommit = WriteBatch.prototype.commit;
  let items = [], failGoogle = false, requests = 0;
  GoogleAuth.prototype.getClient = async () => ({ getRequestHeaders: async () => ({}) });
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://www.googleapis.com');
    assert.equal(parsed.pathname, `/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`);
    requests++;
    return failGoogle ? new Response('fixture unavailable', { status: 503 }) : Response.json({ items });
  };
  let db;
  try {
    const { syncSharedGoogleCalendar } = require('../functions/lib/index.js');
    db = admin.firestore();
    const events = db.collection('events');
    // A unique demo project is passed by the invocation; never clear an existing DB.
    assert.equal((await events.get()).size, 0, 'Use a fresh demo project');
    const restored = { appEventId: 'restored', calendarType: 'shared', sharedGoogleCalendarId: calendar,
      sharedGoogleEventId: 'restored-google', deletedAt: null, title: 'Restored fixture', emoji: '💜',
      createdAt: '2026-01-01T00:00:00.000Z', version: 4 };
    const tombstone = { ...restored, appEventId: 'deleted', sharedGoogleEventId: 'deleted-google', deletedAt: '2026-01-02T00:00:00.000Z' };
    const personal = { appEventId: 'private', calendarType: 'personal', googleCalendarId: 'primary', googleEventId: 'private-google', title: 'Private fixture' };
    const manual = { appEventId: 'manual', calendarType: 'shared', title: 'User fixture', deletedAt: null };
    for (const fixture of [restored, tombstone, personal, manual]) await events.doc(fixture.appEventId).set(fixture);
    const snapshot = async () => (await events.get()).docs.map(d => [d.id, d.data()]).sort(([a], [b]) => a.localeCompare(b));
    const request = { auth: { uid: 'fixture', token: { email: 'masakasakasama.man@gmail.com' } }, data: {} };
    const before = await snapshot();
    failGoogle = true;
    await assert.rejects(syncSharedGoogleCalendar.run(request), { code: 'internal' });
    assert.deepEqual(await snapshot(), before, 'Upstream fault must not alter any event');
    failGoogle = false;
    const empty = await syncSharedGoogleCalendar.run(request);
    assert.equal(empty.deleted, 0);
    assert.deepEqual(await snapshot(), before, 'Missing Google items must not auto-delete restored/user/private/tombstone records');
    const item = id => ({ id, summary: 'Google fixture', start: { date: '2026-10-05' }, end: { date: '2026-10-06' } });
    items = [item('restored-google'), item('deleted-google'), item('new-google'), { ...item('cancelled'), status: 'cancelled' }];
    const result = await syncSharedGoogleCalendar.run(request);
    assert.equal(result.imported, 1); assert.equal(result.updated, 1); assert.equal(result.deleted, 0);
    const updated = (await events.doc('restored').get()).data();
    assert.equal(updated.appEventId, 'restored'); assert.equal(updated.deletedAt, null); assert.equal(updated.emoji, '💜');
    assert.deepEqual((await events.doc('deleted').get()).data(), tombstone);
    assert.deepEqual((await events.doc('private').get()).data(), personal);
    assert.deepEqual((await events.doc('manual').get()).data(), manual);
    await syncSharedGoogleCalendar.run(request);
    assert.equal((await events.get()).size, 5, 'Repeated sync must not duplicate IDs or import cancelled/private records');
    const accepted = await snapshot(), priorRequests = requests;
    process.env.GOOGLE_SHARED_CALENDAR_ID = 'primary';
    await assert.rejects(syncSharedGoogleCalendar.run(request), { code: 'internal' });
    assert.equal(requests, priorRequests, 'Private calendar must be rejected before Google fetch');
    assert.deepEqual(await snapshot(), accepted);
    process.env.GOOGLE_SHARED_CALENDAR_ID = calendar;
    items = [item('failed-write')];
    WriteBatch.prototype.commit = async () => { throw new Error('fixture Firestore write fault'); };
    await assert.rejects(syncSharedGoogleCalendar.run(request), { code: 'internal' });
    WriteBatch.prototype.commit = originalCommit;
    assert.deepEqual(await snapshot(), accepted, 'Write failure must preserve all persisted records');
    await assert.rejects(syncSharedGoogleCalendar.run({ auth: { token: { email: 'fixture@example.invalid' } }, data: {} }), { code: 'permission-denied' });
    assert.deepEqual(await snapshot(), accepted);
  } finally {
    GoogleAuth.prototype.getClient = originalClient;
    globalThis.fetch = originalFetch;
    WriteBatch.prototype.commit = originalCommit;
    if (db) await db.terminate();
    await Promise.all(admin.apps.map(app => app.delete()));
  }
});
