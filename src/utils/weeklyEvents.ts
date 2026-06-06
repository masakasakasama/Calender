// =====================================================================
// 「今週のおすすめイベント」を、リポジトリ同梱の weekly-events.json から読む。
//  - 生成は週1回の定期タスク（GitHub Actions cron / 手動）が行い、ここでは
//    出来上がったJSONを読むだけ。鍵不要・無料・429とは無縁。
//  - 形は AiPlan に合わせてあるので、既存のカードUI・画像取得をそのまま使える。
// =====================================================================
import type { AiPlan } from '@/services/ai/AiPlanService';

export interface WeeklyEvents {
  generatedAt: string;
  area: string;
  events: AiPlan[];
}

const TIERS: AiPlan['tier'][] = ['relax', 'mild', 'active'];

function sanitize(raw: unknown): AiPlan[] {
  const list = (raw as { events?: unknown[] })?.events;
  if (!Array.isArray(list)) return [];
  return list.slice(0, 8).map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const tier = TIERS.includes(o.tier as AiPlan['tier']) ? (o.tier as AiPlan['tier']) : TIERS[i % 3];
    const title = String(o.title ?? 'おすすめ').slice(0, 80);
    const startHour = Number(o.startHour);
    const durationHours = Number(o.durationHours);
    return {
      tier,
      emoji: typeof o.emoji === 'string' && o.emoji ? o.emoji.slice(0, 4) : '✨',
      title,
      description: String(o.description ?? '').slice(0, 400),
      location: String(o.location ?? '').slice(0, 120),
      dateText: String(o.dateText ?? '').slice(0, 60),
      imageQuery: String(o.imageQuery ?? o.location ?? title).slice(0, 120),
      startHour: Number.isFinite(startHour) ? Math.min(23, Math.max(0, Math.round(startHour))) : 11,
      durationHours: Number.isFinite(durationHours) ? Math.min(12, Math.max(1, Math.round(durationHours))) : 3,
    };
  });
}

export async function fetchWeeklyEvents(): Promise<WeeklyEvents | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}weekly-events.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const events = sanitize(json);
    if (events.length === 0) return null;
    return {
      generatedAt: String(json.generatedAt ?? ''),
      area: String(json.area ?? '東京周辺'),
      events,
    };
  } catch {
    return null;
  }
}
