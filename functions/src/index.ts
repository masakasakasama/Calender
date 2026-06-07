// =====================================================================
// AIデートプラン提案 Cloud Function。
//  - Gemini API + Google検索グラウンディングで「その土地の今のイベント」も
//    踏まえたプランを3つ返す。
//  - 許可された2人のメールだけ呼べる（App Check の代わりに Auth で制限）。
//  - APIキーは Functions シークレット GEMINI_API_KEY に保存。
// =====================================================================
import * as admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GOOGLE_SHARED_CALENDAR_ID = defineString('GOOGLE_SHARED_CALENDAR_ID', {
  default: 'aafa5f8d536a1350c75a521c817f9c285194bd57ea2f3699dfd322a8e496aa5f@group.calendar.google.com',
});

setGlobalOptions({ region: 'asia-northeast1', maxInstances: 5 });
admin.initializeApp();

// 利用を許可する2人のメール。
const ALLOWED_EMAILS = ['masakasakasama.man@gmail.com', 'rere.geier@gmail.com'];

const GEMINI_MODEL = 'gemini-2.0-flash';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface PlanRequest {
  area?: string; // 行きたいエリア（任意。未指定なら東京周辺）
  date?: string; // YYYY-MM-DD（任意。基準日。未指定なら今日）
  mood?: string; // のんびり / アクティブ など（任意）
}

interface PlanItem {
  tier: 'relax' | 'mild' | 'active';
  emoji: string;
  title: string;
  description: string;
  location: string;
  dateText: string; // 開催時期（例: "6/7(土)〜6/9(月)" / "今週末" / "通年"）
  imageQuery: string; // 画像検索に使うキーワード（イベント名・スポット名など）
  startHour: number; // 0-23
  durationHours: number; // 1-12
}

interface GoogleEventItem {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  updated?: string;
  colorId?: string;
}

interface CalendarEventDoc {
  appEventId: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay?: boolean;
  reminderMinutes: number | null;
  color?: string | null;
  emoji?: string | null;
  categoryId?: string | null;
  mapsPlaceId?: string | null;
  recurrence?: unknown | null;
  recurrenceParentId?: string | null;
  version?: number;
  calendarType: 'shared' | 'rebecca_source' | 'plan_idea';
  createdBy: string;
  updatedBy: string;
  googleCalendarId: string | null;
  googleEventId: string | null;
  sourceGoogleCalendarId: string | null;
  sourceGoogleEventId: string | null;
  sharedGoogleCalendarId: string | null;
  sharedGoogleEventId: string | null;
  visibility: 'shared' | 'private';
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPrompt(req: PlanRequest): string {
  const area = (req.area || '東京周辺').trim();
  const base = req.date ? new Date(req.date) : new Date();
  const start = fmtDate(base);
  const endD = new Date(base.getTime() + 10 * 24 * 60 * 60 * 1000);
  const end = fmtDate(endD);
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

function toIso(input?: { dateTime?: string; date?: string }): string {
  if (input?.dateTime) return new Date(input.dateTime).toISOString();
  if (input?.date) return new Date(`${input.date}T00:00:00+09:00`).toISOString();
  return new Date().toISOString();
}

function stableGoogleImportId(calendarId: string, eventId: string): string {
  let h1 = 0;
  let h2 = 0;
  const seed = `${calendarId}:${eventId}`;
  for (let i = 0; i < seed.length; i++) {
    h1 = (h1 * 31 + seed.charCodeAt(i)) >>> 0;
    h2 = (h2 * 131 + seed.charCodeAt(i)) >>> 0;
  }
  return `gshared-${h1.toString(16)}${h2.toString(16)}`;
}

function googleKey(event: Pick<CalendarEventDoc, 'sharedGoogleCalendarId' | 'googleCalendarId' | 'sharedGoogleEventId' | 'googleEventId'>): string | null {
  const calendarId = event.sharedGoogleCalendarId ?? event.googleCalendarId;
  const eventId = event.sharedGoogleEventId ?? event.googleEventId;
  return calendarId && eventId ? `${calendarId}:${eventId}` : null;
}

function syncWindow(now = new Date()): { from: Date; to: Date } {
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now);
  to.setFullYear(to.getFullYear() + 1);
  return { from, to };
}

function insideSyncWindow(event: CalendarEventDoc, now = new Date()): boolean {
  const { from, to } = syncWindow(now);
  return new Date(event.end) >= from && new Date(event.start) <= to;
}

function googleToEvent(calendarId: string, item: GoogleEventItem, existing?: CalendarEventDoc): CalendarEventDoc {
  const now = new Date().toISOString();
  const updatedAt = item.updated ? new Date(item.updated).toISOString() : now;
  const title = item.summary ?? 'No title';
  return {
    ...(existing ?? {}),
    appEventId: existing?.appEventId ?? stableGoogleImportId(calendarId, item.id),
    title,
    description: item.description ?? '',
    location: item.location ?? '',
    start: toIso(item.start),
    end: toIso(item.end),
    allDay: Boolean(item.start?.date && !item.start?.dateTime),
    reminderMinutes: existing?.reminderMinutes ?? null,
    color: existing?.color ?? null,
    emoji: existing?.emoji ?? '📌',
    categoryId: existing?.categoryId ?? 'other',
    mapsPlaceId: existing?.mapsPlaceId ?? null,
    recurrence: existing?.recurrence ?? null,
    recurrenceParentId: existing?.recurrenceParentId ?? null,
    version: (existing?.version ?? 1) + 1,
    calendarType: 'shared',
    createdBy: existing?.createdBy ?? 'server-google-sync',
    updatedBy: 'server-google-sync',
    googleCalendarId: calendarId,
    googleEventId: item.id,
    sourceGoogleCalendarId: existing?.sourceGoogleCalendarId ?? null,
    sourceGoogleEventId: existing?.sourceGoogleEventId ?? null,
    sharedGoogleCalendarId: calendarId,
    sharedGoogleEventId: item.id,
    visibility: 'shared',
    syncStatus: 'synced',
    syncError: null,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
    deletedAt: null,
  };
}

async function listSharedGoogleEvents(calendarId: string): Promise<GoogleEventItem[]> {
  const { from, to } = syncWindow();
  const qs = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    maxResults: '2500',
  });
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/calendar.readonly'] });
  const client = await auth.getClient();
  const headers = await client.getRequestHeaders();
  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`, {
    headers: headers as Record<string, string>,
  });
  if (!res.ok) {
    throw new Error(`Google Calendar API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { items?: GoogleEventItem[] };
  return (data.items ?? []).filter((item) => item.id && item.status !== 'cancelled');
}

async function syncSharedGoogleCalendarImpl(): Promise<{ imported: number; updated: number; deleted: number; calendarId: string }> {
  const calendarId = GOOGLE_SHARED_CALENDAR_ID.value();
  const db = admin.firestore();
  const incoming = await listSharedGoogleEvents(calendarId);
  const incomingKeys = new Set(incoming.map((item) => `${calendarId}:${item.id}`));
  const snap = await db.collection('events').where('calendarType', '==', 'shared').get();
  const local = snap.docs.map((doc) => doc.data() as CalendarEventDoc);
  const localByGoogle = new Map<string, CalendarEventDoc>();
  for (const event of local) {
    const key = googleKey(event);
    if (key) localByGoogle.set(key, event);
  }

  let imported = 0;
  let updated = 0;
  let deleted = 0;
  const batch = db.batch();

  for (const item of incoming) {
    const key = `${calendarId}:${item.id}`;
    const existing = localByGoogle.get(key);
    const next = googleToEvent(calendarId, item, existing);
    batch.set(db.collection('events').doc(next.appEventId), next, { merge: true });
    if (existing) updated++;
    else imported++;
  }

  for (const event of local) {
    const key = googleKey(event);
    const isRealSharedGoogleEvent = (event.sharedGoogleCalendarId ?? event.googleCalendarId) === calendarId && key;
    if (!isRealSharedGoogleEvent) continue;
    if (!insideSyncWindow(event)) continue;
    if (incomingKeys.has(key)) continue;
    batch.set(
      db.collection('events').doc(event.appEventId),
      { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: 'server-google-sync' },
      { merge: true },
    );
    deleted++;
  }

  await batch.commit();
  return { imported, updated, deleted, calendarId };
}

export const syncSharedGoogleCalendar = onCall({ timeoutSeconds: 60 }, async (request) => {
  const email = request.auth?.token?.email as string | undefined;
  if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
    throw new HttpsError('permission-denied', 'not allowed');
  }
  try {
    return await syncSharedGoogleCalendarImpl();
  } catch (error) {
    throw new HttpsError('internal', error instanceof Error ? error.message : String(error));
  }
});

export const scheduledSyncSharedGoogleCalendar = onSchedule('every 15 minutes', async () => {
  await syncSharedGoogleCalendarImpl();
});

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
