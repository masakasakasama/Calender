# Firebase 連携セットアップ手順

このアプリは Firebase の設定値が入ると、**本物の Googleログイン + Firestore同期 + レベッカ本人のGoogleカレンダー読み取り**に切り替わります（設定が無い間はデモ動作）。

## 1. Firebase プロジェクトを作る
1. https://console.firebase.google.com/ を開く
2. 「プロジェクトを追加」→ 名前（例: `couple-calendar`）→ 作成
3. 左メニュー **Build → Authentication** → 「始める」→ **Sign-in method** → **Google** を有効化 → 保存
4. 左メニュー **Build → Firestore Database** → 「データベースの作成」→ **本番モード** で開始 → ロケール選択

## 2. Web アプリを登録して設定値を取得
1. プロジェクト設定（⚙️）→ 「全般」→ 一番下「マイアプリ」→ **`</>` Web** を追加
2. 表示される `firebaseConfig` の値を控える（apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId）

## 3. 許可ドメインを追加
- Authentication → Settings → **承認済みドメイン** に `masakasakasama.github.io` を追加（GitHub Pages 用）
- Google Cloud Console → APIs & Services で **Google Calendar API** を有効化

## 4. GitHub Secrets に値を登録
リポジトリ → **Settings → Secrets and variables → Actions → New repository secret** で以下を登録:

| Secret 名 | 値 |
|-----------|-----|
| `VITE_FIREBASE_API_KEY` | firebaseConfig.apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | firebaseConfig.authDomain |
| `VITE_FIREBASE_PROJECT_ID` | firebaseConfig.projectId |
| `VITE_FIREBASE_STORAGE_BUCKET` | firebaseConfig.storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | firebaseConfig.messagingSenderId |
| `VITE_FIREBASE_APP_ID` | firebaseConfig.appId |
| `VITE_PARTNER_EMAIL` | 共有カレンダーだけ使うGoogleアカウント |
| `VITE_REBECCA_EMAIL` | レベッカのGoogleアカウント |

古い名前の `VITE_BOYFRIEND_EMAIL` / `VITE_GIRLFRIEND_EMAIL` も互換で読めますが、新規設定は上の2つを使ってください。

> Firebase Web の apiKey は公開前提の値なので、漏れても直ちに危険ではありません。ただし Secrets 管理が安全です。

## 5. セキュリティルールを適用
1. `firestore.rules` を開き、`allowedEmails()` と `rebeccaEmail()` のメールを**実際の2人のメール**に置換
2. Firebase Console → Firestore Database → **ルール** タブに貼り付けて「公開」

## 6. 再デプロイ
- Actions タブ → 「Deploy to GitHub Pages」→ **Run workflow**（または main へ何かpush）
- 完了後 `https://masakasakasama.github.io/Calender/` を開くと「Googleでログイン」が本物になります

## 確認
- ログイン画面の下部が「許可されたふたりのアカウントだけが使えます」に変わっていれば Firebase 接続成功
- 設定画面の「接続」が **Firebase（クラウド同期）** になります
- Googleログインはブラウザに永続化されるため、更新や再訪問のたびにログインし直す必要はありません
- 共有アカウントは共有カレンダーのみ、レベッカアカウントは共有カレンダー + レベッカ画面を使えます

## うまくいかないとき
- ログインポップアップが出ない → 承認済みドメインに `masakasakasama.github.io` を追加したか確認
- ログイン後すぐ弾かれる → Secrets のメールと実際のGoogleアカウントが一致しているか確認
- データが保存されない → Firestore ルールを公開したか、メールが allowedEmails に入っているか確認
- レベッカ画面でGoogleカレンダーが読めない → Google Calendar API が有効か、ログイン時にCalendar権限を許可したか確認

## セキュリティ方針
- Firebase Auth はブラウザのローカル永続化を使い、通常の再読み込みではログイン状態を維持します。
- Google Calendar API のアクセストークンはlocalStorage等へ保存しません。必要な場合だけFirebase AuthのGoogle providerから取得します。
- Google Calendar 権限はカレンダー一覧の読み取り（`calendar.calendarlist.readonly`）と、ユーザーが編集権限を持つカレンダー上の予定編集（`calendar.events`）です。共有カレンダーを2人で編集できるようにするため、この権限が必要です。
- Firestoreルールで、共有予定は2人だけ、レベッカのGoogleカレンダー設定と共有操作はレベッカ本人だけに制限します。
