// =====================================================================
// 同期サービス契約。
//   7. Google Calendar APIとの差分同期処理（syncToken 相当）
//   9. 複数デバイス同期処理（リポジトリの subscribe が担う土台）
// 本番は GoogleSyncService が syncToken を使った差分同期を実装する。
// =====================================================================
export interface SyncResult {
  changed: number;
  syncToken: string | null;
  at: string;
  status: 'ok' | 'error';
  message?: string;
}

export interface ISyncService {
  /** 差分同期を1回実行。前回 syncToken を使い、新しいトークンを返す。 */
  syncNow(): Promise<SyncResult>;

  /** 起動時/復帰時/定期に呼ぶための購読型。online 復帰時にも発火させる。 */
  startAutoSync(intervalMs: number, onResult: (r: SyncResult) => void): () => void;

  getLastResult(): SyncResult | null;
}
