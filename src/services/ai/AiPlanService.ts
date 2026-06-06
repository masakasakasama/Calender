// =====================================================================
// AIデートプラン提案のクライアント。
//  - Gemini API（generativelanguage REST）を Google検索グラウンディング付きで
//    ブラウザから直接呼ぶ。サーバー(Cloud Functions)不要。
//  - APIキーはビルド時に VITE_GEMINI_API_KEY として注入（GitHub Secret 経由）。
//    ※ クライアントに出る値なので、キーには「HTTPリファラー制限」をかける前提
//      （masakasakasama.github.io のみ許可）。詳細は AI_SETUP.md。
//  - キー未設定 / 失敗時は ok:false を返し、UI側でWeb検索にフォールバック。
// =====================================================================

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();
const GEMINI_MODEL = 'gemini-2.0-flash';

export interface AiPlanRequest {
  area?: string;
  date?: string; // YYYY-MM-DD
  mood?: string;
}

export interface AiPlan {
  tier: 'relax' | 'mild' | 'active';
  emoji: string;
  title: string;
  description: string;
  location: string;
  dateText: string; // 開催時期（例: "今週末" / "6/7(土)〜"）
  imageQuery: string; // 画像検索キーワード
  startHour: number;
  durationHours: number;
}

export interface AiPlanResult {
  ok: boolean;
  plans: AiPlan[];
  grounded?: boolean; // Web検索（グラウンディング）を使えたか
  error?: string; // ユーザー向けメッセージ
}

export function isAiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPrompt(req: AiPlanRequest): string {
  const area = (req.area || '東京周辺').trim();
  const base = req.date ? new Date(req.date) : new Date();
  const start = fmtDate(base);
  const end = fmtDate(new Date(base.getTime() + 10 * 24 * 60 * 60 * 1000));
  const moodLine = req.mood ? `気分・希望: ${req.mood}\n` : '';
  return [
    'あなたはカップルのデートを提案するプロのコンシェルジュです。',
    `Google検索を必ず使って、「${area}」で ${start} 〜 ${end}（これからの約1〜2週間）に`,
    '実際に開催されるイベント・お祭り・期間限定の催し・話題のスポットを調べてください。',
    'その中から、カップルで楽しめるおすすめを日本語で3つ提案してください。',
    '',
    `エリア: ${area}`,
    `基準日: ${start}`,
    moodLine,
    '3つはできれば次の雰囲気でバラけさせてください:',
    '1) relax = のんびり・癒し系  2) mild = 定番  3) active = しっかり遊ぶ',
    '',
    '重要:',
    '- できるだけ「その時期・その土地にしかない実在のイベント名」を入れること（例: スペインのトマト祭り La Tomatina）。',
    '- dateText には開催時期を必ず入れる（例: "6/7(土)〜6/9(月)" や "今週末" など）。',
    '- imageQuery には、そのイベント/スポットの写真が出てきやすい具体的な固有名詞（英語名があれば英語）を入れる。',
    '',
    '出力は必ず次のJSONのみ（前後に文章やコードフェンスを付けない）:',
    '{"plans":[{"tier":"relax","emoji":"☕","title":"…","description":"…","location":"…","dateText":"…","imageQuery":"…","startHour":11,"durationHours":4}, …3件 …]}',
  ].join('\n');
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no json');
  return JSON.parse(raw.slice(start, end + 1));
}

function sanitizePlans(parsed: unknown): AiPlan[] {
  const plans = (parsed as { plans?: unknown[] })?.plans;
  if (!Array.isArray(plans)) return [];
  const tiers: AiPlan['tier'][] = ['relax', 'mild', 'active'];
  return plans.slice(0, 3).map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const tier = tiers.includes(o.tier as AiPlan['tier']) ? (o.tier as AiPlan['tier']) : tiers[i] ?? 'mild';
    const startHour = Number(o.startHour);
    const durationHours = Number(o.durationHours);
    const title = String(o.title ?? 'おすすめ').slice(0, 60);
    return {
      tier,
      emoji: typeof o.emoji === 'string' && o.emoji ? o.emoji.slice(0, 4) : '✨',
      title,
      description: String(o.description ?? '').slice(0, 400),
      location: String(o.location ?? '').slice(0, 120),
      dateText: String(o.dateText ?? '').slice(0, 60),
      imageQuery: String(o.imageQuery ?? o.location ?? title).slice(0, 120),
      startHour: Number.isFinite(startHour) ? Math.min(23, Math.max(0, Math.round(startHour))) : 11,
      durationHours: Number.isFinite(durationHours) ? Math.min(12, Math.max(1, Math.round(durationHours))) : 4,
    };
  });
}

interface CallResult {
  status: number; // 0 = ネットワーク失敗
  text: string;
}

// Gemini を1回呼ぶ。useSearch=true で Google検索グラウンディングを付ける。
async function callGemini(prompt: string, useSearch: boolean): Promise<CallResult> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9 },
  };
  if (useSearch) body.tools = [{ google_search: {} }];

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { status: 0, text: '' };
  }
  if (!res.ok) return { status: res.status, text: '' };
  const json = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return { status: 200, text };
}

function parse(text: string): AiPlan[] {
  try {
    return sanitizePlans(extractJson(text));
  } catch {
    return [];
  }
}

export async function fetchAiPlans(req: AiPlanRequest): Promise<AiPlanResult> {
  if (!isAiConfigured()) {
    return { ok: false, plans: [], error: 'AI機能はまだ準備中です（キー未設定）。' };
  }
  const prompt = buildPrompt(req);

  // 1) Google検索つきを優先（無料枠を無駄に消費しないようリトライは控えめ）。
  const r1 = await callGemini(prompt, true);
  if (r1.status === 200) {
    const plans = parse(r1.text);
    if (plans.length > 0) return { ok: true, plans, grounded: true };
  }
  const lastStatus = r1.status;

  // 2) フォールバック：Google検索なしでAI提案（無料枠で通りやすい）。
  const r2 = await callGemini(prompt, false);
  if (r2.status === 200) {
    const plans = parse(r2.text);
    if (plans.length > 0) return { ok: true, plans, grounded: false };
  }

  // 3) どちらもダメ。状況に応じたメッセージ。
  if (lastStatus === 429 || r2.status === 429) {
    return {
      ok: false,
      plans: [],
      error:
        '今日のAIおすすめは上限に達しました。また明日ためしてね。それまでは下の「🔍 Webで検索」が使えます。',
    };
  }
  if (lastStatus === 0 && r2.status === 0) {
    return { ok: false, plans: [], error: 'AIへの接続に失敗しました。電波の良い場所で再度お試しください。' };
  }
  return {
    ok: false,
    plans: [],
    error: `AIの呼び出しに失敗しました（${lastStatus || r2.status}）。少し時間をおいて試してください。`,
  };
}
