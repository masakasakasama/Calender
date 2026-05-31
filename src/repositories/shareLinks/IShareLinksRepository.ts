import type { ShareLink } from '@/types';

// =====================================================================
// share_links: コピー元(レベッカ)予定 と 共有予定 の対応関係。
// 重複コピー防止と共有解除の根拠データになる。
// =====================================================================
export interface IShareLinksRepository {
  subscribe(listener: (links: ShareLink[]) => void): () => void;
  getAll(): ShareLink[];
  findActiveBySource(sourceGoogleEventId: string): ShareLink | undefined;
  upsert(link: ShareLink): Promise<void>;
  markRemoved(id: string): Promise<void>;
}
