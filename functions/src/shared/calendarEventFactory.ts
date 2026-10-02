// Shared by Functions and browser. No repository writes or identity migration.
interface EventSeed {
  appEventId: string;
  title: string;
  calendarType: 'shared' | 'rebecca_source' | 'plan_idea';
  syncStatus: 'synced' | 'pending' | 'error';
  allDay?: boolean;
  emoji?: string | null;
  syncError?: string | null;
}

export function createCalendarEvent<T extends EventSeed>(input: T): T & {
  allDay: boolean; emoji: string | null; syncError: string | null;
} {
  if (!input.appEventId.trim()) throw new Error('appEventId is required');
  return {
    ...input,
    allDay: input.allDay ?? false,
    emoji: input.emoji === undefined
      ? (input.calendarType === 'plan_idea' ? '💡' : suggestEmoji(input.title)) : input.emoji,
    syncError: input.syncError ?? null,
  };
}

export function googleEventTimes(
  start: { dateTime?: string; date?: string } | undefined,
  end: { dateTime?: string; date?: string } | undefined,
  fallback: string,
): { start: string; end: string; allDay: boolean } {
  const iso = (value: typeof start): string => {
    if (value?.dateTime) return new Date(value.dateTime).toISOString();
    // App's date-only calendar convention is Tokyo midnight, also on UTC servers.
    if (value?.date) return new Date(`${value.date}T00:00:00+09:00`).toISOString();
    return fallback;
  };
  return { start: iso(start), end: iso(end), allDay: Boolean(start?.date && !start?.dateTime) };
}

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
