// =====================================================================
// イベント提案の共通型。
// 生成は外部AI(Gemini等)を使わず、Web検索ベースで作った
// public/weekly-events.json を読む方式に統一したため、ここは型のみ。
// =====================================================================

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
