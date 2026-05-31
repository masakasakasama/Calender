// =====================================================================
// 週末プラン提案エンジン（アプリ内・季節対応）。
// ゆっくり / ちょいアクティブ / アクティブ の3段階で、その日に合わせて提案する。
// 外部AIは使わず、キュレーション済みのアイデア集から決定論的に選ぶ
// （同じ日付なら毎回同じ提案、日付ごとに変化）。
// =====================================================================

export type PlanTier = 'relax' | 'mild' | 'active';

export interface PlanIdea {
  tier: PlanTier;
  emoji: string;
  title: string;
  description: string;
  startHour: number; // 開始時刻（時）
  durationHours: number;
  color?: string;
  months?: number[]; // 適した月(1-12)。未指定は通年
}

export const TIER_LABEL: Record<PlanTier, string> = {
  relax: 'ゆっくり',
  mild: 'ちょいアクティブ',
  active: 'アクティブ',
};

const IDEAS: PlanIdea[] = [
  // --- ゆっくり ---
  { tier: 'relax', emoji: '🎬', title: 'おうち映画デー', description: '気になってた映画を一気見。お菓子も用意して。', startHour: 14, durationHours: 4 },
  { tier: 'relax', emoji: '☕', title: 'カフェ巡り', description: '近所のおしゃれカフェを2〜3軒のんびり。', startHour: 13, durationHours: 3 },
  { tier: 'relax', emoji: '♨️', title: '日帰り温泉・スパ', description: 'ゆっくり浸かって整う。岩盤浴も◎', startHour: 13, durationHours: 4 },
  { tier: 'relax', emoji: '🥐', title: 'ブランチ＆お散歩', description: '少し遅めの朝ごはんを食べて、ゆるっと散歩。', startHour: 10, durationHours: 3 },
  { tier: 'relax', emoji: '🖼️', title: '美術館・展示めぐり', description: '静かに作品を眺めて感想をシェア。', startHour: 13, durationHours: 3 },
  { tier: 'relax', emoji: '📚', title: 'ブックカフェでまったり', description: '本を選んでコーヒー片手にだらだら読書。', startHour: 14, durationHours: 3 },
  { tier: 'relax', emoji: '🍓', title: 'いちご狩り', description: '甘いいちごをお腹いっぱい。', startHour: 11, durationHours: 3, months: [1, 2, 3, 4] },
  { tier: 'relax', emoji: '🎆', title: 'イルミネーション散歩', description: 'きらきらの夜をのんびりお散歩。', startHour: 18, durationHours: 2, months: [11, 12, 1, 2] },
  { tier: 'relax', emoji: '🌸', title: 'お花見ピクニック', description: '桜の下でレジャーシートを広げてのんびり。', startHour: 11, durationHours: 3, months: [3, 4] },

  // --- ちょいアクティブ ---
  { tier: 'mild', emoji: '🐠', title: '水族館デート', description: 'ゆらゆら魚を眺めて癒される定番コース。', startHour: 11, durationHours: 4 },
  { tier: 'mild', emoji: '🛍️', title: 'ショッピング＆ランチ', description: '街でお買い物、気になるお店でランチ。', startHour: 12, durationHours: 4 },
  { tier: 'mild', emoji: '🎳', title: 'ボウリング＆ゲーセン', description: '軽く体を動かして盛り上がる。', startHour: 14, durationHours: 3 },
  { tier: 'mild', emoji: '🏺', title: 'ものづくり体験', description: '陶芸・キャンドル・アクセ作りなど一緒に挑戦。', startHour: 13, durationHours: 3 },
  { tier: 'mild', emoji: '🦓', title: '動物園・サファリ', description: 'たくさん歩いて動物に癒される。', startHour: 10, durationHours: 4 },
  { tier: 'mild', emoji: '🍜', title: '食べ歩きデート', description: '商店街や横丁でいろいろつまむ。', startHour: 12, durationHours: 3 },
  { tier: 'mild', emoji: '🍁', title: '紅葉スポット散策', description: '色づく景色を見ながらのんびりウォーク。', startHour: 11, durationHours: 3, months: [10, 11, 12] },
  { tier: 'mild', emoji: '🏖️', title: '海辺さんぽ＆カフェ', description: '潮風を浴びて海沿いをぶらり。', startHour: 13, durationHours: 3, months: [5, 6, 7, 8, 9] },

  // --- アクティブ ---
  { tier: 'active', emoji: '🥾', title: 'ハイキング・低山登山', description: '景色のいい山で軽く登山、頂上でごはん。', startHour: 9, durationHours: 5 },
  { tier: 'active', emoji: '🎢', title: '遊園地で一日遊ぶ', description: '絶叫ものんびり系も全部楽しむ。', startHour: 10, durationHours: 6 },
  { tier: 'active', emoji: '🚲', title: 'サイクリング', description: 'レンタサイクルで川沿いや街を走る。', startHour: 10, durationHours: 4 },
  { tier: 'active', emoji: '🧗', title: 'ボルダリング', description: '初心者でもOK。達成感がクセになる。', startHour: 13, durationHours: 3 },
  { tier: 'active', emoji: '⛺', title: '日帰りアウトドア', description: 'BBQやデイキャンプで自然を満喫。', startHour: 10, durationHours: 6 },
  { tier: 'active', emoji: '🏄', title: '海・プールで遊ぶ', description: '夏ならやっぱり海！しっかり遊ぶ。', startHour: 10, durationHours: 6, months: [6, 7, 8, 9] },
  { tier: 'active', emoji: '🎿', title: 'スキー・スノボ', description: '雪山で滑って温泉でしめる。', startHour: 9, durationHours: 7, months: [12, 1, 2, 3] },
  { tier: 'active', emoji: '🚗', title: '日帰り小旅行', description: '少し遠出して観光地を巡る。', startHour: 9, durationHours: 7 },
];

// 文字列ハッシュ（決定論的な選択用）。
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

/** その日付に合う3プラン（各tier 1件ずつ）を返す。 */
export function suggestPlans(date: Date): PlanIdea[] {
  const month = date.getMonth() + 1;
  const key = ymd(date);
  const tiers: PlanTier[] = ['relax', 'mild', 'active'];
  return tiers.map((tier) => {
    const pool = IDEAS.filter((i) => i.tier === tier && (!i.months || i.months.includes(month)));
    const list = pool.length > 0 ? pool : IDEAS.filter((i) => i.tier === tier);
    const idx = hash(key + tier) % list.length;
    return list[idx];
  });
}

/** プラン → 予定フォームの初期値。 */
export function planToInitial(date: Date, plan: PlanIdea) {
  const start = new Date(date);
  start.setHours(plan.startHour, 0, 0, 0);
  const end = new Date(start.getTime() + plan.durationHours * 60 * 60 * 1000);
  return {
    title: plan.title,
    emoji: plan.emoji,
    description: plan.description,
    start: start.toISOString(),
    end: end.toISOString(),
    color: plan.color ?? null,
  };
}
