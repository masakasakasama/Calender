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
  location?: string; // Googleマップ検索用の場所名（東京周辺スポット）
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

  // ===== 東京周辺の定番スポット =====
  // --- ゆっくり ---
  { tier: 'relax', emoji: '🎨', title: 'teamLab（お台場/豊洲）', description: '没入型デジタルアート。写真映えも◎', startHour: 13, durationHours: 3, location: 'チームラボ 豊洲' },
  { tier: 'relax', emoji: '🐠', title: 'すみだ水族館', description: 'ソラマチでクラゲやペンギンに癒される。', startHour: 13, durationHours: 3, location: 'すみだ水族館' },
  { tier: 'relax', emoji: '☕', title: '表参道・原宿カフェ巡り', description: 'おしゃれカフェとショップをのんびり。', startHour: 13, durationHours: 3, location: '表参道 カフェ' },
  { tier: 'relax', emoji: '🛁', title: '東京湾の温泉スパ', description: '都内の日帰りスパでゆっくり整う。', startHour: 13, durationHours: 4, location: '東京 日帰り温泉 スパ' },
  { tier: 'relax', emoji: '🌷', title: '新宿御苑さんぽ', description: '広い芝生でピクニック気分。', startHour: 11, durationHours: 3, location: '新宿御苑', months: [3, 4, 5, 9, 10, 11] },
  { tier: 'relax', emoji: '🌃', title: '東京タワー/スカイツリー夜景', description: '展望台から夜景を眺めるロマンチックコース。', startHour: 18, durationHours: 2, location: '東京タワー' },
  // --- ちょいアクティブ ---
  { tier: 'mild', emoji: '🛍️', title: '渋谷・原宿でショッピング', description: '話題のスポットを巡って食べ歩きも。', startHour: 12, durationHours: 4, location: '渋谷 スクランブルスクエア' },
  { tier: 'mild', emoji: '🐼', title: '上野動物園＆上野公園', description: 'パンダを見て公園や美術館もはしご。', startHour: 10, durationHours: 4, location: '上野動物園' },
  { tier: 'mild', emoji: '⛩️', title: '浅草・浅草寺さんぽ', description: '仲見世で食べ歩き、人力車も楽しい。', startHour: 11, durationHours: 3, location: '浅草寺' },
  { tier: 'mild', emoji: '🎡', title: 'お台場デート', description: '海沿いを散歩して観覧車・ショッピング。', startHour: 13, durationHours: 4, location: 'お台場 ダイバーシティ' },
  { tier: 'mild', emoji: '🍜', title: '中目黒・代官山さんぽ', description: 'カフェと雑貨と川沿いの散歩。', startHour: 12, durationHours: 3, location: '中目黒' },
  { tier: 'mild', emoji: '🌸', title: '目黒川の桜並木', description: '川沿いの桜を散歩しながらお花見。', startHour: 11, durationHours: 3, location: '目黒川 桜', months: [3, 4] },
  { tier: 'mild', emoji: '🎄', title: '丸の内イルミネーション', description: '丸の内〜日比谷のきらめきを散歩。', startHour: 17, durationHours: 3, location: '丸の内イルミネーション', months: [11, 12, 1, 2] },
  // --- アクティブ ---
  { tier: 'active', emoji: '🎢', title: '富士急/としまえん跡 等', description: '絶叫マシンで一日たっぷり遊ぶ。', startHour: 9, durationHours: 8, location: '富士急ハイランド' },
  { tier: 'active', emoji: '🐭', title: '東京ディズニーリゾート', description: '朝から夜まで夢の国を満喫。', startHour: 9, durationHours: 10, location: '東京ディズニーリゾート' },
  { tier: 'active', emoji: '⛰️', title: '高尾山ハイキング', description: '都心から日帰り。山頂でお弁当。', startHour: 9, durationHours: 6, location: '高尾山', months: [3, 4, 5, 6, 9, 10, 11] },
  { tier: 'active', emoji: '🏖️', title: '江ノ島・鎌倉日帰り', description: '海と古都を電車でめぐる定番デート。', startHour: 9, durationHours: 8, location: '江ノ島' },
  { tier: 'active', emoji: '🚲', title: '皇居・多摩川サイクリング', description: 'レンタサイクルで気持ちよく走る。', startHour: 10, durationHours: 4, location: '皇居 サイクリング' },
  { tier: 'active', emoji: '🎆', title: '隅田川・神宮外苑の花火', description: '夏の風物詩。浴衣で花火大会へ。', startHour: 17, durationHours: 4, location: '隅田川花火大会', months: [7, 8] },
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
    location: plan.location ?? '',
    start: start.toISOString(),
    end: end.toISOString(),
    color: plan.color ?? null,
  };
}
