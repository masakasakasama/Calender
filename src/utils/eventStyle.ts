// =====================================================================
// 予定の見た目（10色のカラーパレット）と、タイトルからの絵文字自動推定。
// =====================================================================

export interface EventColor {
  id: string;
  label: string;
  value: string; // メインの色（バー/ドット）
}

// パステル系の10色。
export const EVENT_COLORS: EventColor[] = [
  { id: 'pink', label: 'ピンク', value: '#ff8fc0' },
  { id: 'lavender', label: 'ラベンダー', value: '#b39ddf' },
  { id: 'sky', label: 'スカイ', value: '#8fc7ff' },
  { id: 'mint', label: 'ミント', value: '#7fd9b3' },
  { id: 'lemon', label: 'レモン', value: '#f4cf57' },
  { id: 'peach', label: 'ピーチ', value: '#ffb38f' },
  { id: 'coral', label: 'コーラル', value: '#ff8f9e' },
  { id: 'lilac', label: 'ライラック', value: '#d39dff' },
  { id: 'teal', label: 'ティール', value: '#5fc6c2' },
  { id: 'slate', label: 'グレー', value: '#a8a0bd' },
];

export const DEFAULT_COLOR = EVENT_COLORS[0].value;

export const EVENT_CATEGORIES = [
  { id: 'date', label: 'デート', color: '#ff8fc0', emoji: '💕' },
  { id: 'meal', label: 'ごはん', color: '#ffb38f', emoji: '🍽️' },
  { id: 'home', label: '家・生活', color: '#7fd9b3', emoji: '🏠' },
  { id: 'travel', label: '旅行', color: '#8fc7ff', emoji: '✈️' },
  { id: 'work', label: '仕事', color: '#a8a0bd', emoji: '💼' },
  { id: 'health', label: '健康', color: '#5fc6c2', emoji: '🏥' },
  { id: 'money', label: 'お金', color: '#f4cf57', emoji: '💰' },
  { id: 'other', label: 'その他', color: '#b39ddf', emoji: '📌' },
] as const;

export function categoryById(id: string | null | undefined) {
  return EVENT_CATEGORIES.find((c) => c.id === id) ?? EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
}

export function colorById(id: string | null | undefined): string {
  return EVENT_COLORS.find((c) => c.id === id)?.value ?? id ?? DEFAULT_COLOR;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace('#', '');
  if (m.length !== 6) return null;
  const n = parseInt(m, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 任意のhex色を、アプリの10色パレットの中で最も近い色に変換する。 */
export function nearestPaletteColor(hex: string | null | undefined): string {
  if (!hex) return DEFAULT_COLOR;
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_COLOR;
  let best = EVENT_COLORS[0];
  let bestDist = Infinity;
  for (const c of EVENT_COLORS) {
    const crgb = hexToRgb(c.value);
    if (!crgb) continue;
    const d = (rgb[0] - crgb[0]) ** 2 + (rgb[1] - crgb[1]) ** 2 + (rgb[2] - crgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.value;
}

// --- 絵文字 ----------------------------------------------------------

// 手動で選べる絵文字パレット。
export const EMOJI_PALETTE = [
  '📌', '💕', '🍽️', '☕', '🍻', '🎬', '🎤', '✈️',
  '🏖️', '♨️', '🎂', '🎉', '🎁', '💼', '📞', '📚',
  '💪', '🧘', '💇', '🛍️', '🏥', '🚗', '🚶', '🐶',
  '🌸', '⭐', '❤️', '🏠', '🎮', '⚽',
];

// タイトルのキーワード → 絵文字。先に一致したものを採用。
const RULES: [RegExp, string][] = [
  [/(ランチ|ディナー|ご飯|ごはん|食事|レストラン|焼肉|寿司|ラーメン|ご馳走|ブランチ)/, '🍽️'],
  [/(カフェ|お茶|コーヒー|珈琲|スタバ|喫茶)/, '☕'],
  [/(飲み|居酒屋|お酒|ビール|宅飲み|乾杯|バー)/, '🍻'],
  [/(映画|シネマ|cinema|movie)/i, '🎬'],
  [/(ライブ|コンサート|フェス|concert|live)/i, '🎤'],
  [/(旅行|旅|出張|帰省|trip|travel)/i, '✈️'],
  [/(海|ビーチ|プール|beach)/i, '🏖️'],
  [/(温泉|スパ|サウナ|銭湯)/, '♨️'],
  [/(誕生日|バースデー|birthday)/i, '🎂'],
  [/(記念日|お祝い|アニバーサリー|anniversary)/i, '🎉'],
  [/(プレゼント|ギフト|gift)/i, '🎁'],
  [/(デート|date)/i, '💕'],
  [/(仕事|会議|ミーティング|mtg|打ち合わせ|商談|面談|meeting)/i, '💼'],
  [/(電話|通話|tel|call)/i, '📞'],
  [/(勉強|試験|テスト|学習|study)/i, '📚'],
  [/(ジム|筋トレ|トレーニング|運動|ランニング|gym|workout)/i, '💪'],
  [/(ヨガ|ピラティス|yoga)/i, '🧘'],
  [/(美容院|ヘア|カット|サロン|ネイル|hair)/i, '💇'],
  [/(買い物|ショッピング|shopping|買物)/i, '🛍️'],
  [/(病院|通院|歯医者|クリニック|診察)/, '🏥'],
  [/(ドライブ|車|運転|drive)/i, '🚗'],
  [/(散歩|お散歩|walk)/i, '🚶'],
  [/(犬|散歩|ペット|猫|dog|cat)/i, '🐶'],
  [/(花見|お花|誕生|春|桜)/, '🌸'],
  [/(家|自宅|掃除|home)/i, '🏠'],
  [/(ゲーム|game)/i, '🎮'],
  [/(サッカー|野球|スポーツ|試合|soccer)/i, '⚽'],
];

/** タイトルから絵文字を推定。該当なしは📌。 */
export function suggestEmoji(title: string): string {
  const t = title.trim();
  if (!t) return '📌';
  for (const [re, emoji] of RULES) {
    if (re.test(t)) return emoji;
  }
  return '📌';
}
