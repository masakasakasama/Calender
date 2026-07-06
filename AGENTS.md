# AGENTS.md — Calender 開発ガイド & エージェント間コーディネーション

このリポジトリは複数の AI エージェント（Codex / Claude Code）が編集します。
このファイルは**共有の指示書**です。作業前に必ず読むこと。

## プロジェクト概要
カップル用の共有カレンダー PWA（Vite + React 18 + TypeScript）。
- 本番: GitHub Pages（`main` push で `.github/workflows/deploy.yml` が自動デプロイ）。
- データ: Firebase Auth（Google ログイン, 許可2メールのみ）+ Firestore（`events` コレクション, onSnapshot 同期）。
- 共有カレンダー: 実 Google カレンダー `APP_CONFIG.googleSharedCalendarId`（`...@group.calendar.google.com`）。

## 開発ルール
- 変更後は必ず `npm run build`（`tsc -b && vite build`）が**緑**であること。
- `src/config/appConfig.ts` の `appVersion` を変更ごとに上げる（単一ソース）。
- 作業ブランチ `claude/couple-calendar-pwa-mvp-OEwKi` → `main` に ff-merge して push（push で自動デプロイ）。
- ローカルの TypeScript が 6.x だと `tsconfig` の `baseUrl` で誤エラーが出るが、CI は pinned 5.6 なので**`ignoreDeprecations` を足さない**こと（CI が壊れる）。`npm ci` でビルドすれば緑。

---

## 🚨 絶対に守る不変条件（過去に実際に事故った。再発厳禁）

1. **予定を自動削除しない。**
   `eventsRepo.softDelete` はユーザーの明示操作（`deleteEvent` = 削除ボタン）だけが呼ぶ。
   dedup / stale / sync / purge / cleanup など**自動処理から softDelete を呼ばない**。
   重複は表示側 `dedupeSharedEvents()` で**隠すだけ**（DB は消さない）。
   → 過去、購読内で自動 softDelete して無限ループ＆ユーザー予定（レベッカの予定）を消す事故。

2. **個人カレンダーを取り込まない。**
   Google 取り込みは専用共有カレンダー（`APP_CONFIG.googleSharedCalendarId`, `@group...`）の
   **ID 一致のみ**。カレンダー**名**一致 / `primary` / `owner` / `list[0]` での自動有効化は禁止。
   → 過去、本人の個人カレンダー全部を共有に流し込む事故。

3. **Google カレンダーへ Delete API を撃たない。** アプリ内の予定は Firestore が正本。

4. 削除復元の導線を消さない: `DeletedEventsSection` / `RestoredTodaySection` と
   `eventsRepo.restore()` / `getAllRaw()`。

5. Firestore doc は `appEventId` を必ず持たせる（`FirestoreEventsRepository` は doc.id で補完済み）。
   保存前に `appEventId` が空なら push しない（`undefined` パスでクラッシュする）。

---

## 📌 Codex へのタスク依頼：Google 同期レイヤの一本化

Claude Code 側と合意済みの本命リファクタ。**同期系ファイルは Codex が担当**（二重編集の衝突回避のため Claude は触らない）。

### 現状の問題（監査済み）
同一の Google イベントを **3 経路が別々の appEventId** で `events` に書き込み → 恒久的な重複＆相互削除:
- server: `functions/src/index.ts` `syncSharedGoogleCalendarImpl` → `gshared-<hashA>`（`stableGoogleImportId`）
- client: `src/hooks/useGoogleSharedCalendarSync.ts` のブラウザ直 fallback → `gshared-<hashB>`（別ハッシュ）
- partner: `src/hooks/useGoogleSync.ts`（`copyEventToShared`）→ `shared-<cal>-<id>`

さらに `syncWindow` / `googleKey`(cal:id) / `isRealGoogleSharedEvent` が **4 箇所にコピペ**
（`functions/src/index.ts`, `src/utils/googleSharedSync.ts`, `GoogleCalendarService.ts` ×2）。

### 目標
1. **書き込み権限者を 1 つに**する。サーバーの `scheduledSyncSharedGoogleCalendar` を正本とし、
   クライアントの重複 import 経路（`useGoogleSharedCalendarSync` のブラウザ fallback import、
   `useGoogleSync` の `copyEventToShared`）は**撤去**、または表示専用の read に降格。
2. **1 つの決定論的 `appEventId`** を全経路で共有する。
   例: `gshared-<stableHash(calendarId + ':' + eventId)>` を server/client 共通関数にする。
   → 同一 Google イベントは必ず同一 doc になり、重複が構造的に発生しない。
3. 重複ユーティリティ（`syncWindow` / `googleKey` / `isRealGoogleSharedEvent` / `stableGoogleImportId`）を
   `src/utils/googleSharedSync.ts` に集約し、全箇所から import。server 側は同等ロジックを共有 or 一致させる。
4. 取り込み対象は @group 共有カレンダー **ID 一致のみ**（不変条件 2）。
5. **自動削除は一切入れない**（不変条件 1）。stale 掃除・tombstone の自動 softDelete もしない。
6. `CalendarEvent` の組み立てを 1 つの factory に寄せ、`allDay` / `syncError` / emoji 既定値の
   場所ごとの差異（`useSharedEvents` / `usePlanIdeas` / `GoogleCalendarService.listRebecca*` /
   server `googleToEvent`）を解消する。

### 受け入れ基準
- 1 つの Google イベントにつき、アプリ内ドキュメントは **1 つ**（重複ゼロ）。
- 個人カレンダー予定が共有に入らない。
- ユーザー / 復元済みの予定が**自動で消えない**。
- `npm run build` 緑。`appVersion` を上げて main へ。

### 進め方（安全策）
- 着手前に、設定 → バックアップ「書き出し」で JSON を残す想定でユーザーに周知。
- 大きく一度に変えず、①ID 統一 → ②重複経路撤去 → ③util 集約 → ④factory、の順で小さく。各段で build 緑。
