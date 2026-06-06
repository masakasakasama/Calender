// =====================================================================
// イベント/スポットの画像をキーワードから取得する。
//  1) Wikipedia（日本語→英語）のページサムネイル … 有名イベントに強い・正確
//  2) Openverse 画像検索 … ローカルな祭りなど幅広くカバー（無料・キー不要・CORS可）
//  3) どちらも無ければ null（UI側でグラデーション＋絵文字にフォールバック）
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

async function openverseThumb(query: string): Promise<string | null> {
  // Openverse は CC 画像の検索API。匿名でも使える（2人なのでレート制限は問題なし）。
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&page_size=1&mature=false`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: { thumbnail?: string; url?: string }[];
    };
    const first = json.results?.[0];
    return first?.thumbnail ?? first?.url ?? null;
  } catch {
    return null;
  }
}

export async function fetchEventImage(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;
  if (cache.has(q)) return cache.get(q) ?? null;
  const result =
    (await wikiThumb('ja', q)) ??
    (await wikiThumb('en', q)) ??
    (await openverseThumb(q));
  cache.set(q, result);
  return result;
}
