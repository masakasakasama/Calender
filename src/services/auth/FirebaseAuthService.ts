import {
  GoogleAuthProvider,
  browserLocalPersistence,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  setPersistence,
  type User as FbUser,
} from 'firebase/auth';
import type { User } from '@/types';
import { isAllowedUser, resolveRole } from '@/config/appConfig';
import { firebaseAuth } from '@/services/firebase/firebaseApp';
import type { IUsersRepository } from '@/repositories/users/IUsersRepository';
import type { IAuthService } from './IAuthService';

// =====================================================================
// 本番の Googleログイン。Firebase Auth + GoogleAuthProvider。
// 許可された2メール以外はサインアウトさせて拒否する。
// =====================================================================
function makeProvider(includeCalendarScopes = false): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  if (includeCalendarScopes) {
    provider.addScope('https://www.googleapis.com/auth/calendar.calendarlist.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
  }
  return provider;
}

function toAppUser(fb: FbUser): User {
  const now = new Date().toISOString();
  const role = resolveRole(fb.email);
  if (!role) throw new Error('このアカウントはこのアプリを利用できません');
  return {
    userId: fb.uid,
    displayName: fb.displayName ?? (fb.email ?? 'ユーザー'),
    email: (fb.email ?? '').toLowerCase(),
    role,
    photoURL: fb.photoURL ?? null,
    notificationEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export class FirebaseAuthService implements IAuthService {
  private current: User | null = null;
  private googleAccessToken: string | null = null;

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
    const auth = firebaseAuth();
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithPopup(auth, makeProvider());
    if (!isAllowedUser(cred.user.email)) {
      await fbSignOut(firebaseAuth());
      throw new Error('このアカウントはこのアプリを利用できません');
    }
    const user = toAppUser(cred.user);
    this.current = user;
    await this.users.upsert(user).catch(() => {});
    return user;
  }

  /**
   * Googleカレンダー用アクセストークン。
   * 既にこのセッションで取得済みなら再利用する。
   * 未取得のときは「自動ではポップアップを出さない」（=何度もログインを防ぐ）。
   * 明示的な連携が必要なときは connectGoogleCalendar() を使う。
   */
  async getGoogleAccessToken(): Promise<string | null> {
    return this.googleAccessToken;
  }

  /** ユーザー操作で1回だけ Google カレンダー連携（同意）を行う。 */
  async connectGoogleCalendar(): Promise<boolean> {
    if (this.googleAccessToken) return true;
    const auth = firebaseAuth();
    const cred = await signInWithPopup(auth, makeProvider(true));
    if (!isAllowedUser(cred.user.email)) {
      await fbSignOut(firebaseAuth());
      throw new Error('このアカウントはこのアプリを利用できません');
    }
    const oauth = GoogleAuthProvider.credentialFromResult(cred);
    this.googleAccessToken = oauth?.accessToken ?? null;
    const user = toAppUser(cred.user);
    this.current = user;
    await this.users.upsert(user).catch(() => {});
    return this.googleAccessToken != null;
  }

  isGoogleCalendarConnected(): boolean {
    return this.googleAccessToken != null;
  }

  async signOut(): Promise<void> {
    this.current = null;
    this.googleAccessToken = null;
    await fbSignOut(firebaseAuth());
  }
}
