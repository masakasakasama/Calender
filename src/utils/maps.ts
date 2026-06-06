// Googleマップ連携。場所名から検索URLを作り、タップでマップアプリ/サイトを開く。
// スマホでは Google マップアプリが入っていれば自動でアプリが起動する
// （universal link 形式の https://www.google.com/maps/search/ を使用）。

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function openInMaps(query: string): void {
  const q = query.trim();
  if (!q) return;
  window.open(mapsSearchUrl(q), '_blank', 'noopener,noreferrer');
}

// その土地のイベント/祭りをWebでライブにGoogle検索する。
export function openEventSearch(area: string): void {
  const a = area.trim() || '東京';
  const now = new Date();
  const q = `${a} イベント 祭り ${now.getFullYear()}年${now.getMonth() + 1}月`;
  window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
}
