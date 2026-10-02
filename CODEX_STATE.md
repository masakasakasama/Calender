# CODEX_STATE

Status: in_progress
Goal: AGENTS.mdで依頼されたGoogle同期レイヤ一本化を段階的に完了する。

## Done
- server/clientのstableGoogleImportIdは最新コードで同一の31/131 hashだったことを確認。古い監査の異なるhash前提を再実装しなかった。
- useGoogleSharedCalendarSyncのブラウザ直接import/upsert fallbackを撤去。Callable serverだけを取り込みwriterとし、失敗時はエラーと既存snapshotを保持して次のtriggerで再試行。
- appVersionを0.38.10へ。server成功/失敗/online再試行/local無変更/cleanupを回帰2テストで確認。CI build前へ追加。

- 段階3: googleKey / syncWindow / isRealGoogleSharedEvent / stableGoogleImportIdをFunctionsのpure moduleへ集約し、browser utilityで再export。
- 従来31/131 hashとgshared prefixを維持し、ID移行を行わない。専用group ID一致をserver/browser両入口で検証。
- 同期期間をTokyo年始〜同時刻翌年へ統一。UTC/Tokyo/Los Angelesで同一結果を確認。appVersion0.38.11、CIへFunctions buildを追加。

- 段階4: Functions/browser共通factoryへ共有予定・アイデア・Google表示・server importを集約。allDay/syncError/emoji既定値を統一。
- date-onlyはTokyo midnightへ統一、Google exclusive endと既存appEventId/明示emojiを維持。appVersion0.38.12。

## Current
- 段階4までsource共通化が完了。本番Functions反映と実Googleアカウント検証は未完了。
- バックアップ書き出しを周知。自動削除・Google Delete API・ID移行を追加していない。

## Next
- isolated Firebase Emulatorでserver故障・復元済み予定・private calendar除外を検証した後、資格情報の範囲でFunctions反映を確認する。

## Blockers
- 本番Firebase Cloud Functions接続/デプロイ権限・実Googleアカウント受入結果がない。fixtureテストを本番合格としない。

## Verification
- npm test: 10/10 passed
- npm run build: TS/Vite/PWA passed; functions npm run build passed
- UTC/Tokyo/Los Angeles date-only同一、timed offsetと明示emoji/null・error・private・既存ID・tombstone保持を確認
- git diff --check passed; existing bundle-size warning

Updated at: 2026-10-02T20:53:02.988626+00:00
