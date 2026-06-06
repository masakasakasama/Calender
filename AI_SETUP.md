# AIおすすめイベントのセットアップ（スマホだけでOK）

プランタブの「✨ 今週のおすすめイベント」は、Gemini API を Web検索付きで呼んで、
その土地の“今”のイベント・お祭り（例：スペインのトマト祭り）を画像付きで提案します。

サーバー（Cloud Functions）は不要。**スマホのブラウザだけ**で設定できます。
やることは大きく2つ、合計5分くらい。

---

## ステップ1：Gemini APIキーを作る（スマホでOK）

1. スマホのブラウザで https://aistudio.google.com/app/apikey を開く
2. Googleでログイン（プロジェクトの持ち主アカウント `warikan-app-120fd`）
3. 「**Create API key（APIキーを作成）**」をタップ
4. プロジェクト `warikan-app-120fd` を選んで作成
5. 出てきたキー（`AIza...`）を**コピー**

> 無料枠があり、2人で使う分にはほぼ無料です。

---

## ステップ2：GitHubにキーを登録する（スマホのブラウザでOK）

1. スマホのブラウザ（アプリではなく **Chrome/Safariのブラウザ版**）で
   https://github.com/masakasakasama/Calender/settings/secrets/actions を開く
2. 「**New repository secret**」をタップ
3. Name に **`GEMINI_API_KEY_CALENDER`** と入力
4. Secret にステップ1でコピーしたキーを貼り付け
5. 「**Add secret**」をタップ

これで完了。次にアプリが自動ビルド・デプロイされると、AIが有効になります。

> ※ GitHubのスマホアプリだと Secrets 画面が無いことがあります。
>   その場合は「ブラウザでデスクトップ表示」にして上のURLを開いてください。

---

## ステップ3：反映を待つ（自動）

- Secret を入れた後、コードが更新されると GitHub Actions が自動でビルド＆デプロイします。
- すぐ反映したい場合は、リポジトリの **Actions タブ → Deploy to GitHub Pages →
  「Run workflow」** を押すと手動で再デプロイできます（スマホのブラウザ可）。
- 数分後にアプリのプランタブを開くと、今週のおすすめイベントが画像付きで出ます🎉

---

## （任意・おすすめ）キーの悪用を防ぐ制限

このキーはアプリ（公開ページ）に埋め込まれるため、念のため利用元を縛っておくと安心です。

1. https://console.cloud.google.com/apis/credentials を開く（プロジェクト warikan-app-120fd）
2. 作ったAPIキーをタップ
3. 「アプリケーションの制限」→「**HTTPリファラー**」を選ぶ
4. 次を追加:
   - `https://masakasakasama.github.io/*`
5. 「APIの制限」→「Generative Language API」だけ許可
6. 保存

> これをやると、他人がキーを抜き出してもこのアプリ以外からは使えません。
> 無料枠もあるので必須ではありませんが、やっておくと安全です。

---

## 仕組み

- アプリ（`src/services/ai/AiPlanService.ts`）から Gemini の
  `generativelanguage` API を `google_search` グラウンディング付きで直接呼びます。
- キーは GitHub Secret `GEMINI_API_KEY_CALENDER` → ビルド時に `VITE_GEMINI_API_KEY` として注入。
- キー未登録でもアプリは壊れず、「🔍 かわりにWebで検索」ボタンにフォールバックします。

（補足：`functions/` 配下にサーバー版の実装も残してあります。将来キーを完全に
サーバー側へ隠したくなったら、そちらをデプロイする選択肢もあります。今は不要です。）
