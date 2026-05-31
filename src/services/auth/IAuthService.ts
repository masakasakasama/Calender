import type { User } from '@/types';

// =====================================================================
// 認証サービス契約。
// 本番は FirebaseAuthService (signInWithPopup + GoogleAuthProvider)。
// MVP は MockAuthService。どちらも isAllowedUser() を通して
// 「許可された2人以外は使えない」を保証する。
// =====================================================================
export interface IAuthService {
  getCurrentUser(): User | null;
  onAuthStateChanged(listener: (user: User | null) => void): () => void;

  /** Googleログイン。許可外メールなら reject。 */
  signInWithGoogle(): Promise<User>;

  /** MVP専用: モックでそのまま入る（本番では未使用）。 */
  signInMock?(): Promise<User>;

  /** Google Calendar API 用のOAuthアクセストークン。未連携なら null（自動ポップアップしない）。 */
  getGoogleAccessToken?(): Promise<string | null>;

  /** ユーザー操作でGoogleカレンダー連携（同意ポップアップ）を1回だけ行う。 */
  connectGoogleCalendar?(): Promise<boolean>;

  /** 現在Googleカレンダー連携済みか。 */
  isGoogleCalendarConnected?(): boolean;

  signOut(): Promise<void>;
}
