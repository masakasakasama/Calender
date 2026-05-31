import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User as FbUser,
} from 'firebase/auth';
import type { User } from '@/types';
import { isAllowedUser } from '@/config/appConfig';
import { firebaseAuth } from '@/services/firebase/firebaseApp';
import type { IUsersRepository } from '@/repositories/users/IUsersRepository';
import type { IAuthService } from './IAuthService';

// =====================================================================
// 本番の Googleログイン。Firebase Auth + GoogleAuthProvider。
// 許可された2メール以外はサインアウトさせて拒否する。
// =====================================================================
function toAppUser(fb: FbUser): User {
  const now = new Date().toISOString();
  return {
    userId: fb.uid,
    displayName: fb.displayName ?? (fb.email ?? 'ユーザー'),
    email: (fb.email ?? '').toLowerCase(),
    photoURL: fb.photoURL ?? null,
    notificationEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export class FirebaseAuthService implements IAuthService {
  private current: User | null = null;

  constructor(private users: IUsersRepository) {}

  getCurrentUser(): User | null {
    return this.current;
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return fbOnAuthStateChanged(firebaseAuth(), async (fb) => {
      if (fb && isAllowedUser(fb.email)) {
        const user = toAppUser(fb);
        this.current = user;
        // users コレクションへ自分を upsert（プロフィール同期）。
        await this.users.upsert(user).catch(() => {});
        listener(user);
      } else {
        if (fb) await fbSignOut(firebaseAuth()).catch(() => {}); // 許可外は即サインアウト
        this.current = null;
        listener(null);
      }
    });
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(firebaseAuth(), provider);
    if (!isAllowedUser(cred.user.email)) {
      await fbSignOut(firebaseAuth());
      throw new Error('このアカウントはこのアプリを利用できません');
    }
    const user = toAppUser(cred.user);
    this.current = user;
    return user;
  }

  async signOut(): Promise<void> {
    this.current = null;
    await fbSignOut(firebaseAuth());
  }
}
