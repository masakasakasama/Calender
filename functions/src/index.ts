// =====================================================================
// AIデートプラン提案 Cloud Function。
//  - Gemini API + Google検索グラウンディングで「その土地の今のイベント」も
//    踏まえたプランを3つ返す。
//  - 許可された2人のメールだけ呼べる（App Check の代わりに Auth で制限）。
//  - APIキーは Functions シークレット GEMINI_API_KEY に保存。
// =====================================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

setGlobalOptions({ region: 'asia-northeast1', maxInstances: 5 });

// 利用を許可する2人のメール。
const ALLOWED_EMAILS = ['masakasakasama.man@gmail.com', 'rere.geier@gmail.com'];

const GEMINI_MODEL = 'gemini-2.0-flash';

interface PlanRequest {
  area?: string; // 行きたいエリア（例: スペイン / 京都 / お台場）
  date?: string; // YYYY-MM-DD（任意）
  mood?: string; // のんびり / アクティブ など（任意）
}

interface PlanItem {
  tier: 'relax' | 'mild' | 'active';
  emoji: string;
  title: string;
  description: string;
  location: string;
  startHour: number; // 0-23
  durationHours: number; // 1-12
}

function buildPrompt(req: PlanRequest): string {
  const area = (req.area || '東京周辺').trim();
  const dateLine = req.date ? `日付: ${req.date}\n` : '';
  const moodLine = req.mood ? `気分・希望: ${req.mood}\n` : '';
  return [
    'あなたはカップルのデートプランを考えるプロのコンシェルジュです。',
    'Google検索を使って、その土地で「今・近い時期」に実際に開催されるイベントやお祭り、',
    '話題のスポットを必ず調べてから、カップル向けのデートプランを日本語で3つ提案してください。',
    '',
    `行きたいエリア: ${area}`,
    dateLine + moodLine,
    '3つのプランはそれぞれ次の雰囲気にしてください:',
    '1) relax = のんびり・ゆったり癒し系',
    '2) mild  = 定番・ほどよくアクティブ',
    '3) active = しっかり遊ぶアクティブ系',
    '',
    'できる限り、検索で見つけた実在のイベント名・スポット名・地名を location や description に入れてください。',
    '',
    '出力は必ず次のJSONのみ（前後に文章やコードフェンスを付けない）:',
    '{"plans":[{"tier":"relax","emoji":"☕","title":"…","description":"…","location":"…","startHour":11,"durationHours":4}, …3件 …]}',
  ].join('\n');
}

function extractJson(text: string): unknown {
  // コードフェンスや前後テキストを除去して最初の { … } を取り出す。
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no json');
  return JSON.parse(raw.slice(start, end + 1));
}

function sanitizePlans(parsed: unknown): PlanItem[] {
  const plans = (parsed as { plans?: unknown[] })?.plans;
  if (!Array.isArray(plans)) return [];
  const tiers: PlanItem['tier'][] = ['relax', 'mild', 'active'];
  return plans.slice(0, 3).map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const tier = tiers.includes(o.tier as PlanItem['tier']) ? (o.tier as PlanItem['tier']) : tiers[i] ?? 'mild';
    const startHour = Number(o.startHour);
    const durationHours = Number(o.durationHours);
    return {
      tier,
      emoji: typeof o.emoji === 'string' && o.emoji ? o.emoji.slice(0, 4) : '✨',
      title: String(o.title ?? 'おすすめプラン').slice(0, 60),
      description: String(o.description ?? '').slice(0, 400),
      location: String(o.location ?? '').slice(0, 120),
      startHour: Number.isFinite(startHour) ? Math.min(23, Math.max(0, Math.round(startHour))) : 11,
      durationHours: Number.isFinite(durationHours) ? Math.min(12, Math.max(1, Math.round(durationHours))) : 4,
    };
  });
}

export const suggestPlans = onCall(
  { secrets: [GEMINI_API_KEY], cors: true, timeoutSeconds: 60 },
  async (request) => {
    const email = request.auth?.token?.email as string | undefined;
    if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
      throw new HttpsError('permission-denied', 'このアプリの利用が許可されたアカウントではありません。');
    }

    const req = (request.data ?? {}) as PlanRequest;
    const prompt = buildPrompt(req);

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
      `?key=${GEMINI_API_KEY.value()}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.9 },
        }),
      });
    } catch (e) {
      throw new HttpsError('unavailable', 'AIへの接続に失敗しました。', String(e));
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HttpsError('internal', `AIエラー (${res.status})`, body.slice(0, 500));
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

    let plans: PlanItem[] = [];
    try {
      plans = sanitizePlans(extractJson(text));
    } catch {
      throw new HttpsError('internal', 'AIの返答を解釈できませんでした。もう一度お試しください。');
    }

    if (plans.length === 0) {
      throw new HttpsError('internal', 'プランを生成できませんでした。もう一度お試しください。');
    }

    return { plans };
  },
);
