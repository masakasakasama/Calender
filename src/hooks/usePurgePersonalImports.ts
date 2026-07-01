import type { User } from '@/types';

// 【一時停止】自動削除は無効化中。
// 直前の「共有カレンダー以外のGoogle由来を消す」実装は、共有にコピーされた
// 予定（レベッカの共有分など）まで巻き込む恐れがあったため、安全策としてすべての
// 自動削除を停止する。個人カレンダーの流入は取り込み側（useGoogleSync を
// 共有カレンダーIDのみに限定）で止めているので、これ以上ゴミは増えない。
// 既存のゴミの掃除・誤削除の復旧は、安全な手順を確定してから別途行う。
export function usePurgePersonalImports(_user: User | null): void {
  // no-op
}
