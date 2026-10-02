# Shared Google sync rules

`functions/src/shared/googleSharedSync.ts` is a pure module used by the server and re-exported through `src/utils/googleSharedSync.ts` for browser readers. Keeping it inside the Functions source root lets the Functions compiler package it without importing browser/Firebase application modules.

- `stableGoogleImportId` retains the previous unsigned 31/131 hashes and `gshared-` prefix. Existing documents are not migrated.
- `googleKey` prefers shared Google IDs, then the existing source ID fields.
- `isRealGoogleSharedEvent` requires shared calendar type and exact configured dedicated `@group.calendar.google.com` ID. Calendar names and `primary` do not enable import.
- `syncWindow` uses Japan time: January 1 of the current Tokyo year through the same local date/time next year. It is independent of server/device timezone. Leap-day rollover follows JavaScript calendar arithmetic as before.
- Stale IDs remain diagnostics only; no automatic delete or Google Delete API is added.

Validation: six Node tests cover stable identity, dedicated-calendar eligibility, Tokyo year boundary in UTC/Tokyo/Los Angeles, document preservation, and server-only hook success/failure/retry. Both PWA and Functions compile locally. Production Functions deployment and real-account sync remain separate checks.
