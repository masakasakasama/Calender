# Isolated shared-sync verification

`scripts/calendar-sync-emulator.test.mjs` invokes the compiled callable's `run`
handler against a real Firestore Emulator. Google Auth/Calendar responses and a
Firestore write fault are injected fixtures. It does not run the Functions HTTP
emulator, validate real Google credentials, or establish production deployment acceptance.

Start a Firestore Emulator bound to localhost (tested with Firebase's
cloud-firestore-emulator-v1.19.8.jar and Java 21), then run:

```sh
npm --prefix functions run build
FIRESTORE_EMULATOR_HOST=127.0.0.1:8189 \
GCLOUD_PROJECT=demo-calender-sync-unique-run \
node --test scripts/calendar-sync-emulator.test.mjs
```

Use a fresh `demo-` project on every run; no database cleanup is performed.
The test refuses remote emulator hosts, non-demo project IDs, or a configured
GOOGLE_APPLICATION_CREDENTIALS file. Ordinary `npm test` skips this integration
case when no emulator host is supplied. No service account/provider key is needed.

The test checks upstream failure and injected batch-write failure preserve all
persisted records; absent Google items do not delete restored/user/private records
or tombstones; existing restored IDs and emoji are preserved; repeated imports
produce one deterministic document; cancelled items are excluded; private calendar
configuration is rejected before fetching; unauthorized callers cannot synchronize.
Only synthetic documents in the isolated emulator are written. The installed SDK
may attempt a metadata credential lookup; this is not real Calendar authorization.
Production Functions deployment and actual account/device acceptance remain pending.
