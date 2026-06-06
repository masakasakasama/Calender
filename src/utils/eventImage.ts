// =====================================================================
// イベント/スポットの画像をキーワードから取得する。
//  - Wikipedia（日本語→英語）のページサムネイルを使う。
//    APIキー不要・CORS対応（origin=*）・無料で安定。
//  - 見つからなければ null（UI側でグラデーション＋絵文字にフォールバック）。
//  - 同一キーワードはメモ化して無駄な通信を避ける。
// =====================================================================

const cache = new Map<string, string | null>();

async function wikiThumb(lang: 'ja' | 'en', query: string): Promise<string | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=480`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };
    const pages = json.query?.pages;
    if (!pages) return null;
    for (const key of Object.keys(pages)) {
      const src = pages[key]?.thumbnail?.source;
      if (src) return src;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchEventImage(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;
  if (cache.has(q)) return cache.get(q) ?? null;
  const result = (await wikiThumb('ja', q)) ?? (await wikiThumb('en', q));
  cache.set(q, result);
  return result;
}
