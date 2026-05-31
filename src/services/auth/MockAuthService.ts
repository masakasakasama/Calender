import type { User } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';
import { localStore } from '@/repositories/db/LocalStore';
import type { IUsersRepository } from '@/repositories/users/IUsersRepository';
import type { IAuthService } from './IAuthService';

const SESSION_KEY = 'auth_session'; // 現在ログイン中の userId

// MVP のモックユーザー（許可された人として扱う）。
const MOCK_USER: Omit<User, 'createdAt' | 'updatedAt'> = {
  userId: 'user-me',
  displayName: 'わたし',
  email: APP_CONFIG.allowedEmails[0],
  photoURL: null,
  notificationEnabled: false,
};

export class MockAuthService implements IAuthService {
  constructor(private users: IUsersRepository) {}

  getCurrentUser(): User | null {
    const userId = localStore.get<string | null>(SESSION_KEY, null);
    if (!userId) return null;
    return this.users.getById(userId) ?? null;
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return localStore.subscribe<string | null>(SESSION_KEY, null, () => {
      listener(this.getCurrentUser());
    });
  }

  async signInWithGoogle(): Promise<User> {
    return this.signInMock();
  }

  async signInMock(): Promise<User> {
    const now = new Date().toISOString();
    const user = await this.users.upsert({ ...MOCK_USER, createdAt: now, updatedAt: now });
    localStore.set(SESSION_KEY, user.userId);
    return user;
  }

  async signOut(): Promise<void> {
    localStore.set<string | null>(SESSION_KEY, null);
  }
}
