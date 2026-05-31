# Couple Calendar 💜

彼氏とレベッカの2人専用・共有カレンダー PWA（MVP）。

固定URLで開き、Googleログイン（本番）またはユーザー切り替え（MVP）で
「彼氏 / レベッカ」を判定します。共有予定は2人に見え、レベッカの既存
Googleカレンダーと非共有予定はレベッカだけが扱えます。

> 現在は **MVP / モック実装**。Google Calendar API・Firebase Auth・
> Firestore・Web Push は **インターフェースだけ定義し、モックで動作**します。
> あとから実APIに差し替えられる構造です（後述）。

---

## できること（MVP 完成条件）

- 固定URLでアクセス（招待リンク・ペアコードなし）
- 彼氏 / レベッカのユーザー切り替え（本番はメール判定に差し替え）
- 役割で変わるUI（彼氏にはレベッカ画面を出さない）
- 共有カレンダー画面（月/週/日表示、追加・編集・削除）
- レベッカ画面（モックGoogleカレンダー一覧、表示/同期選択、予定一覧）
- レベッカが選んだ予定だけ共有カレンダーへコピー（共有/解除）
- 非共有予定は彼氏側に出ない（型・データ・ルールで多重に担保）
- 複数デバイス自動同期の土台（subscribe 型 / BroadcastChannel）
- 起動時/復帰時/定期のアップデート確認・自動更新の土台
- PWA（manifest + Service Worker、ホーム画面追加）
- 通知許可と通知送信の土台（アプリ内通知 + Notification API）

---

## セットアップ

```bash
npm install
cp .env.example .env   # 必要なら値を編集（MVPは未設定でも動く）
npm run dev            # http://localhost:5173
```

その他のコマンド:

```bash
npm run build      # 型チェック + 本番ビルド（dist/ に SW 生成）
npm run preview    # ビルド結果をプレビュー
npm run typecheck  # 型チェックのみ
```

---

## アーキテクチャ（責務分離）

要件で指定された処理を、すべて関数 / サービス / コンポーネントに分離しています。

| # | 要件の処理 | 実装場所（インターフェース / モック） |
|---|------------|----------------------------------------|
| 1 | Googleログイン | `services/auth/IAuthService` / `MockAuthService` |
| 2 | ユーザー判定 | `config/appConfig.ts`（`resolveRole`/`isAllowedUser`） |
| 3 | 共有カレンダー取得 | `services/calendar` (`listSharedEvents`) |
| 4 | レベッカの既存カレンダー一覧取得 | `services/calendar` (`listRebeccaCalendars`) |
| 5 | レベッカの予定取得 | `services/calendar` (`listRebeccaEvents`) |
| 6 | 共有カレンダーへコピー | `services/calendar` (`copyEventToShared`) + `services/share/ShareService` |
| 7 | Google Calendar 差分同期 | `services/sync/ISyncService` / `MockSyncService`（syncToken） |
| 8 | PWA アップデート確認 | `services/update/UpdateService` |
| 9 | 複数デバイス同期 | `repositories/**`（subscribe 型）+ `repositories/db/LocalStore` |
| 10 | 通知 | `services/notification/INotificationService` / `MockNotificationService` |

ディレクトリ:

```
src/
  config/        許可ユーザー判定・バックエンド選択の単一ソース
  types/         ドメイン型（users / app_config / events / share_links ...）
  repositories/  events, users, settings, shareLinks（I*.ts = 契約 / Local* = モック）
    db/          LocalStore（onSnapshot 相当の subscribe を持つモックDB）
  services/      auth, calendar, sync, notification, update, share, container
  hooks/         useAuth, useSharedEvents, useRebeccaCalendars, useNotifications, useSync, useUpdate
  components/    calendar/, pwa/
  screens/       Login, Shared, Rebecca, Notifications, Settings
  utils/         date, id
```

依存の組み立ては `services/container.ts` に集約。`VITE_BACKEND` を
`firebase` にして実装クラスを差し込むだけで全体を切り替えられます。

---

## 実API への差し替え手順

1. **Firebase Auth**: `FirebaseAuthService implements IAuthService` を作成し、
   `signInWithGoogle` を `signInWithPopup(GoogleAuthProvider)` に。ログイン後の
   メールを `resolveRole()` に通す経路はそのまま使えます。
2. **Firestore**: `FirestoreEventsRepository` などを `onSnapshot` で実装し、
   各 `I*Repository` を満たす。`subscribe` 型なので hook は無改修。
3. **Google Calendar API**: `GoogleCalendarService implements ICalendarService` を
   `gapi`/REST で実装。メソッドは API と 1:1（`calendarList.list`,
   `calendars.insert`, `events.insert/list/patch/delete`）。`extendedProperties` に
   `appEventId`/`source*`/`calendarType` を保存し、重複は `share_links` で防止。
4. **差分同期**: `GoogleSyncService` で `syncToken` を使った `events.list` を実装。
5. **Web Push / FCM**: `FcmNotificationService implements INotificationService`。
6. これらを `container.ts` の `buildFirebaseContainer()` で結線し、`VITE_BACKEND=firebase`。

`firestore.rules` に、本番の権限制御（彼氏はレベッカの設定/非共有予定を読めない等）の
雛形を同梱しています。

---

## デプロイ

静的SPA + SW なので Vercel / Firebase Hosting / Cloudflare Pages のいずれでも可。

**Vercel**
- Build command: `npm run build` / Output: `dist`
- 環境変数に `.env.example` の `VITE_*` を設定

**Firebase Hosting**
```bash
npm run build
firebase deploy --only hosting        # public: dist, rewrites: すべて /index.html
firebase deploy --only firestore:rules
```
SPA フォールバック（全ルート → `/index.html`）を設定してください。

---

## セキュリティ / プライバシー方針

- 許可された2メール以外は利用不可（`resolveRole` が単一の判定点）。
- 彼氏は `rebecca_calendar_settings` と `rebecca_source` の予定を読めない
  （UI遮断 + Firestore ルール + データ型で多重防御）。
- レベッカが明示的に共有した予定だけ `shared` として彼氏に見える。
- OAuthトークンをフロントへ不用意に保存しない（本番実装時の指針）。
- Google Calendar スコープは最小限（`.env.example` 参照）。

## 既知のMVP制約

- 同期・通知・更新・Google連携は土台のみ（モック）。
- 競合解決は「updatedAt が新しい方を優先」の基本方針のみ実装。
