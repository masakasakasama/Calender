# AIデートプラン提案のセットアップ

プランタブの「✨ AIでおすすめを探す」は、Cloud Functions 経由で Gemini API を呼び、
Web検索（Google検索グラウンディング）でその土地の“今”のイベントまで調べて提案します。

セットアップは **1回だけ**。以下を順にやればOKです（所要5〜10分）。

---

## 前提

- Firebase プロジェクト: `warikan-app-120fd`
- 課金プラン: **Blaze（従量課金）** が有効（✅ 有効化済み）
- ローカルに Node 20 と Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

---

## 1. Gemini APIキーを取得

1. https://aistudio.google.com/app/apikey を開く
2. 「Create API key」→ プロジェクト `warikan-app-120fd` を選んで作成
3. 表示されたキー（`AIza...`）をコピー

> 無料枠があり、2人で使う範囲なら基本的に無料〜ごくわずかです。

---

## 2. APIキーを Functions のシークレットに登録

リポジトリのルートで:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

聞かれたら、さっきコピーしたキーを貼り付けて Enter。

---

## 3. 依存をインストールしてデプロイ

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

デプロイ完了後、`suggestPlans`（リージョン `asia-northeast1`）が作成されます。

---

## 4. 動作確認

1. アプリを開く（許可された2人のアカウントでログイン）
2. プランタブ →「✨ AIでおすすめを探す」
3. 「スペイン」などを入れて「✨ AI提案」

> まだデプロイしていない / 失敗した場合でも、アプリは壊れず
> 「かわりにWebで検索する」ボタンが出るので普通に使えます。

---

## 仕組み・安全性

- APIキーはクライアントには出ず、Functions のシークレットにだけ保存されます。
- `suggestPlans` は許可された2人のメール
  （`masakasakasama.man@gmail.com` / `rere.geier@gmail.com`）以外は呼べません。
- モデルは `gemini-2.0-flash` ＋ `google_search` グラウンディング。
- 実装: `functions/src/index.ts` / クライアント: `src/services/ai/AiPlanService.ts`
