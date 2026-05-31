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

  signOut(): Promise<void>;
}
