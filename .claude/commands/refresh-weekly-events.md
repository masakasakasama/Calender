---
description: 今週のおすすめイベントをWeb検索で更新する（Gemini不使用）
---

「今週のおすすめイベント」を最新化します。Gemini など外部AI APIは使いません。
あなた自身の WebSearch でリアルな開催情報を集めて JSON を書き換えます。

手順:

1. WebSearch で「東京 イベント 祭り （今月） 開催 デート」などを検索し、
   これから約1〜2週間に **実際に開催される** イベント／お祭り／期間限定の催しを
   5件ほど集める（できれば relax / mild / active の雰囲気をバラけさせる）。
2. 各イベントを次の形にまとめ、`public/weekly-events.json` を上書きする:
   ```json
   {
     "generatedAt": "YYYY-MM-DD",
     "area": "東京周辺",
     "events": [
       {
         "tier": "relax | mild | active",
         "emoji": "💠",
         "title": "イベント名",
         "description": "カップル目線の一言説明",
         "location": "場所（マップ検索できる地名）",
         "dateText": "開催時期（例: 6/12(金)〜6/14(日) / 今週末）",
         "imageQuery": "写真が出やすい固有名詞（英語名があれば英語）",
         "startHour": 11,
         "durationHours": 3
       }
     ]
   }
   ```
3. `generatedAt` は今日の日付（JST）。
4. 変更があれば commit して `main` に push する（push すると Deploy が走り本番反映）。
   - ブランチ運用に従い、必要なら feature ブランチ経由で main に ff-merge する。
5. 取得元が不確かなときは無理に載せず、確かなものだけにする。
