// =====================================================================
// 「今週のおすすめイベント」を生成して public/weekly-events.json に書く。
// GitHub Actions の週次 cron から実行（鍵は CI シークレット GEMINI_API_KEY）。
//  - Google検索つき(グラウンディング)を優先し、ダメなら検索なしで生成。
//  - 生成に失敗したら既存JSONは上書きしない（最後の良い状態を保つ）。
//  - 週1回しか走らないので無料枠でも余裕。
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = (process.env.GEMINI_API_KEY || '').trim();
const MODEL = 'gemini-2.0-flash';
const OUT = new URL('../public/weekly-events.json', import.meta.url);
const AREA = process.env.WEEKLY_AREA || '東京周辺';

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prompt() {
  const base = new Date();
  const start = fmt(base);
  const end = fmt(new Date(base.getTime() + 10 * 864e5));
  return [
    'あなたはカップルのデートを提案するプロのコンシェルジュです。',
    `Google検索を使い、「${AREA}」で ${start} 〜 ${end}（これからの約1〜2週間）に`,
    '実際に開催されるイベント・お祭り・期間限定の催し・話題のスポットを調べ、',
    'カップルで楽しめるおすすめを日本語で5つ提案してください。',
    'できるだけ実在のイベント名・地名を入れ、dateText に開催時期、imageQuery に写真が出やすい固有名詞を入れること。',
    'tier は relax / mild / active のいずれかでバラけさせる。',
    '出力は次のJSONのみ（前後に文章やコードフェンス無し）:',
    '{"events":[{"tier":"relax","emoji":"💠","title":"…","description":"…","location":"…","dateText":"…","imageQuery":"…","startHour":11,"durationHours":3}, …5件…]}',
  ].join('\n');
}

async function callGemini(useSearch) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt() }] }],
    generationConfig: { temperature: 0.9 },
  };
  if (useSearch) body.tools = [{ google_search: {} }];
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Gemini ${useSearch ? '(grounded)' : '(plain)'} -> HTTP ${res.status}`);
    return null;
  }
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

function parseEvents(text) {
  if (!text) return [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s === -1 || e === -1) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(s, e + 1));
  } catch {
    return [];
  }
  const tiers = ['relax', 'mild', 'active'];
  const list = Array.isArray(parsed.events) ? parsed.events : [];
  return list.slice(0, 8).map((o, i) => {
    const title = String(o.title ?? 'おすすめ').slice(0, 80);
    const sh = Number(o.startHour);
    const dh = Number(o.durationHours);
    return {
      tier: tiers.includes(o.tier) ? o.tier : tiers[i % 3],
      emoji: o.emoji ? String(o.emoji).slice(0, 4) : '✨',
      title,
      description: String(o.description ?? '').slice(0, 400),
      location: String(o.location ?? '').slice(0, 120),
      dateText: String(o.dateText ?? '').slice(0, 60),
      imageQuery: String(o.imageQuery ?? o.location ?? title).slice(0, 120),
      startHour: Number.isFinite(sh) ? Math.min(23, Math.max(0, Math.round(sh))) : 11,
      durationHours: Number.isFinite(dh) ? Math.min(12, Math.max(1, Math.round(dh))) : 3,
    };
  });
}

async function main() {
  if (!KEY) {
    console.error('GEMINI_API_KEY が無いのでスキップ（既存JSONを維持）。');
    process.exit(0);
  }
  let events = parseEvents(await callGemini(true).catch(() => null));
  if (events.length === 0) events = parseEvents(await callGemini(false).catch(() => null));

  if (events.length === 0) {
    console.error('生成できなかったので既存JSONを維持して終了。');
    process.exit(0);
  }

  const out = { generatedAt: fmt(new Date()), area: AREA, events };
  let prev = '';
  try {
    prev = readFileSync(OUT, 'utf8');
  } catch {
    /* 初回 */
  }
  const next = JSON.stringify(out, null, 2) + '\n';
  if (prev.trim() === next.trim()) {
    console.log('変更なし。');
    process.exit(0);
  }
  writeFileSync(OUT, next);
  console.log(`weekly-events.json を更新（${events.length}件）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(0); // 失敗してもCIは落とさない（既存JSON維持）
});
