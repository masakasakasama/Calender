import type { User, UserRole } from '@/types';

// =====================================================================
// 認証サービス契約。
// 1. Googleログイン処理 / 2. ユーザー判定処理 を担う。
// 本番は FirebaseAuthService (signInWithPopup + GoogleAuthProvider)。
// MVP は MockAuthService（ロール切り替え）。
// どちらも resolveRole() を通して「許可された2人以外は使えない」を保証する。
// =====================================================================
export interface IAuthService {
  /** 現在ログイン中ユーザー（未ログインは null）。 */
  getCurrentUser(): User | null;

  /** ログイン状態の購読。 */
  onAuthStateChanged(listener: (user: User | null) => void): () => void;

  /** Googleログイン。本番は OAuth、MVP はモック。許可外なら reject。 */
  signInWithGoogle(): Promise<User>;

  /** MVP専用: ロールを直接指定して切り替え（本番では未使用）。 */
  signInAsRole?(role: UserRole): Promise<User>;

  signOut(): Promise<void>;
}
