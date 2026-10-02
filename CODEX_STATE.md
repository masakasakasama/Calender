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

## Current
- 段階3のsource共通化が完了。Cloud Functionsへの本番デプロイは未実施で、実アカウント同期合格ではない。
- バックアップ書き出しを周知。予定の自動削除・Google Delete API・既存doc移行を追加していない。

## Next
- 段階4: CalendarEvent factoryのallDay/timezone/emoji/syncErrorを統一。既存doc IDを変える移行はせず自動削除を入れない。
- isolated Firebase Emulatorでserver故障・復元済み予定・private calendar除外を検証した後、資格情報の範囲でFunctions反映を確認する。

## Blockers
- 本番Firebase Cloud Functionsへの接続/デプロイは今回未実施。server停止時はブラウザfallbackで更新せずエラー保持となる。
- Google Calendar実アカウントの取り込み動作はfixtureテストから合格としない。

## Verification
- npm test: 6/6 passed (existing hook 2 + shared rules 4)
- npm run build: TS/Vite/PWA passed; functions npm ci + npm run build passed
- legacy ID golden fixture retained; Tokyo window consistent across three timezones; private events ineligible and documents unchanged
- git diff --check passed; existing bundle-size warning

Updated at: 2026-10-02T17:51:04.608640+00:00
