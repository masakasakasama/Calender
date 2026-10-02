# CODEX_STATE

Status: in_progress
Goal: AGENTS.mdで依頼されたGoogle同期レイヤ一本化を段階的に完了する。

## Done
- server/clientのstableGoogleImportIdは最新コードで同一の31/131 hashだったことを確認。古い監査の異なるhash前提を再実装しなかった。
- useGoogleSharedCalendarSyncのブラウザ直接import/upsert fallbackを撤去。Callable serverだけを取り込みwriterとし、失敗時はエラーと既存snapshotを保持して次のtriggerで再試行。
- appVersionを0.38.10へ。server成功/失敗/online再試行/local無変更/cleanupを回帰2テストで確認。CI build前へ追加。

## Current
- 段階2の重複取り込み経路撤去まで完了。useGoogleSync.tsは最新ツリーに存在しない。既存予定の削除・移行・本番DB操作は行っていない。
- バックアップ書き出し/削除復元導線と専用group ID限定の方針を維持。

## Next
- 段階3: googleKey/syncWindow/isRealGoogleSharedEvent/stableGoogleImportIdをserver/clientで共有または同等化し、fixtureで一貫性を検証。
- 段階4: CalendarEvent factoryのallDay/timezone/emoji/syncErrorを統一。既存doc IDを変える移行はせず自動削除を入れない。
- isolated Firebase Emulatorでserver故障、復元済み予定、private calendar除外を検証。本番をテストDBに使わない。

## Blockers
- 本番Firebase Cloud Functionsへの接続/デプロイは今回未実施。server停止時はブラウザfallbackで更新せずエラー保持となる。
- Google Calendar実アカウントの取り込み動作はfixtureテストから合格としない。

## Verification
- node --test scripts/google-sync.test.mjs: 2/2 passed
- npm run build: TypeScript/Vite/PWA passed、既存bundle-size warningあり
- 既存sourceのimport routesとID hashを照合、git diff --check passed

Updated at: 2026-10-02T10:55:00.710873+00:00
