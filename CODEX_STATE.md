# CODEX_STATE

Status: blocked
Goal: AGENTS.mdで依頼されたGoogle同期レイヤ一本化を段階的に完了する。

## Done
- 既存Callable handlerと実Firestore Emulatorで、upstream故障・batch書込み故障の非破壊、復元済み/ユーザー/private予定・tombstone保持、private設定のfetch前拒否、取消除外、同一IDの重複防止、認証拒否を検証。再実行テスト/手順を保存、appVersion0.38.13。
- server/clientのstableGoogleImportIdは最新コードで同一の31/131 hashだったことを確認。古い監査の異なるhash前提を再実装しなかった。
- useGoogleSharedCalendarSyncのブラウザ直接import/upsert fallbackを撤去。Callable serverだけを取り込みwriterとし、失敗時はエラーと既存snapshotを保持して次のtriggerで再試行。
- appVersionを0.38.10へ。server成功/失敗/online再試行/local無変更/cleanupを回帰2テストで確認。CI build前へ追加。

- 段階3: googleKey / syncWindow / isRealGoogleSharedEvent / stableGoogleImportIdをFunctionsのpure moduleへ集約し、browser utilityで再export。
- 従来31/131 hashとgshared prefixを維持し、ID移行を行わない。専用group ID一致をserver/browser両入口で検証。
- 同期期間をTokyo年始〜同時刻翌年へ統一。UTC/Tokyo/Los Angelesで同一結果を確認。appVersion0.38.11、CIへFunctions buildを追加。

- 段階4: Functions/browser共通factoryへ共有予定・アイデア・Google表示・server importを集約。allDay/syncError/emoji既定値を統一。
- date-onlyはTokyo midnightへ統一、Google exclusive endと既存appEventId/明示emojiを維持。appVersion0.38.12。

## Current
- 保存Nextのisolated Emulator検証を完了。本番書込みなし。Google/Authとbatch故障はfixture、Functions HTTP Emulatorや本番Google認証・Firestoreルールの合格とは扱わない。
- 段階4までsource共通化が完了。本番Functions反映と実Googleアカウント検証は未完了。
- バックアップ書き出しを周知。自動削除・Google Delete API・ID移行を追加していない。

## Next
- 本番Firebase/Functions資格情報が利用可能になったら、既存バックアップ/担当状況を確認した上でFunctionsの反映と実Google共有カレンダー受入を確認する。isolated Emulatorの成功済み検証を不要に繰り返さない。

## Blockers
- 本番Firebase Cloud Functions接続/デプロイ権限・実Googleアカウント受入結果がない。fixtureテストを本番合格としない。

## Verification
- Firestore Emulator v1.19.8/Java21 on localhost with fresh demo project: integration test passed; actual persisted-record assertions through compiled Callable run handler, fixture Google/Auth and injected batch-write failure
- npm test: existing 10/10 passed; emulator case intentionally skipped in default suite and separately executed successfully
- Functions tsc and root TS/Vite/PWA production build passed; git diff --check passed; no synchronization production-code/data changes; existing bundle-size warning
- Runtime250 current: configured secrets/capabilities empty; Firebase token/ADC bindings absent. Production deployment and Google account acceptance not attempted
- npm test: 10/10 passed
- npm run build: TS/Vite/PWA passed; functions npm run build passed
- UTC/Tokyo/Los Angeles date-only同一、timed offsetと明示emoji/null・error・private・既存ID・tombstone保持を確認
- git diff --check passed; existing bundle-size warning

Updated at: 2026-10-04T20:35:58.986241+00:00
