import type { User, UserRole } from '@/types';
import { APP_CONFIG, resolveRole } from '@/config/appConfig';
import { localStore } from '@/repositories/db/LocalStore';
import type { IUsersRepository } from '@/repositories/users/IUsersRepository';
import type { IAuthService } from './IAuthService';

const SESSION_KEY = 'auth_session'; // 現在ログイン中の userId

// MVP のモックユーザー定義（許可された2名）。
const MOCK_USERS: Record<UserRole, Omit<User, 'createdAt' | 'updatedAt'>> = {
  boyfriend: {
    userId: 'user-boyfriend',
    displayName: '彼氏',
    email: APP_CONFIG.boyfriendEmail,
    photoURL: null,
    role: 'boyfriend',
    notificationEnabled: false,
  },
  rebecca: {
    userId: 'user-rebecca',
    displayName: 'レベッカ',
    email: APP_CONFIG.girlfriendEmail,
    photoURL: null,
    role: 'rebecca',
    notificationEnabled: false,
  },
};

export class MockAuthService implements IAuthService {
  constructor(private users: IUsersRepository) {}

  getCurrentUser(): User | null {
    const userId = localStore.get<string | null>(SESSION_KEY, null);
    if (!userId) return null;
    const role: UserRole = userId === MOCK_USERS.rebecca.userId ? 'rebecca' : 'boyfriend';
    return this.users.getByRole(role) ?? null;
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return localStore.subscribe<string | null>(SESSION_KEY, null, () => {
      listener(this.getCurrentUser());
    });
  }

  /** モックではデフォルトで彼氏。本番はここを OAuth に差し替える。 */
  async signInWithGoogle(): Promise<User> {
    return this.signInAsRole('boyfriend');
  }

  async signInAsRole(role: UserRole): Promise<User> {
    const base = MOCK_USERS[role];
    // 許可ユーザー判定（本番と同じ経路を通す）。
    if (!resolveRole(base.email)) {
      throw new Error('このアカウントはこのアプリを利用できません');
    }
    const now = new Date().toISOString();
    const user = await this.users.upsert({ ...base, createdAt: now, updatedAt: now });
    localStore.set(SESSION_KEY, user.userId);
    return user;
  }

  async signOut(): Promise<void> {
    localStore.set<string | null>(SESSION_KEY, null);
  }
}
