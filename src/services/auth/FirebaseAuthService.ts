import {
  GoogleAuthProvider,
  browserLocalPersistence,
  indexedDBLocalPersistence,
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

const GCAL_TOKEN_KEY = 'calender_google_calendar_access_token';
const GCAL_TOKEN_EXPIRES_KEY = 'calender_google_calendar_access_token_expires_at';
const APP_USER_CACHE_KEY = 'calender_last_signed_in_user';

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
  private current: User | null = this.restoreCachedUser();
  private googleAccessToken: string | null = this.restoreGoogleAccessToken();

  constructor(private users: IUsersRepository) {}

  private restoreCachedUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(APP_USER_CACHE_KEY);
      if (raw) {
        const user = JSON.parse(raw) as User;
        if (isAllowedUser(user.email)) return user;
      }
    } catch {
      // Fall through to Firebase's own persisted auth snapshot.
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('firebase:authUser:')) continue;
      try {
        const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as {
          uid?: string;
          email?: string;
          displayName?: string;
          photoURL?: string | null;
        };
        const role = resolveRole(stored.email);
        if (!stored.email || !stored.uid || !role || !isAllowedUser(stored.email)) continue;
        const now = new Date().toISOString();
        const user: User = {
          userId: stored.uid,
          displayName: stored.displayName ?? stored.email,
          email: stored.email.toLowerCase(),
          role,
          photoURL: stored.photoURL ?? null,
          notificationEnabled: false,
          createdAt: now,
          updatedAt: now,
        };
        this.rememberCachedUser(user);
        return user;
      } catch {
        // Keep scanning other Firebase auth slots.
      }
    }
    return null;
  }

  private rememberCachedUser(user: User | null): void {
    if (typeof localStorage === 'undefined') return;
    if (!user) {
      localStorage.removeItem(APP_USER_CACHE_KEY);
      return;
    }
    localStorage.setItem(APP_USER_CACHE_KEY, JSON.stringify(user));
  }

  private restoreGoogleAccessToken(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    const expiresAt = Number(sessionStorage.getItem(GCAL_TOKEN_EXPIRES_KEY) ?? '0');
    const token = sessionStorage.getItem(GCAL_TOKEN_KEY);
    if (!token || !expiresAt || Date.now() >= expiresAt) {
      sessionStorage.removeItem(GCAL_TOKEN_KEY);
      sessionStorage.removeItem(GCAL_TOKEN_EXPIRES_KEY);
      return null;
    }
    return token;
  }

  private rememberGoogleAccessToken(token: string | null): void {
    this.googleAccessToken = token;
    if (typeof sessionStorage === 'undefined') return;
    if (!token) {
      sessionStorage.removeItem(GCAL_TOKEN_KEY);
      sessionStorage.removeItem(GCAL_TOKEN_EXPIRES_KEY);
      return;
    }
    sessionStorage.setItem(GCAL_TOKEN_KEY, token);
    sessionStorage.setItem(GCAL_TOKEN_EXPIRES_KEY, String(Date.now() + 55 * 60 * 1000));
  }

  getCurrentUser(): User | null {
    return this.current;
  }

  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return fbOnAuthStateChanged(firebaseAuth(), async (fb) => {
      if (fb && isAllowedUser(fb.email)) {
        const user = toAppUser(fb);
        this.current = user;
        this.rememberCachedUser(user);
        // users コレクションへ自分を upsert（プロフィール同期）。
        await this.users.upsert(user).catch(() => {});
        listener(user);
      } else {
        if (fb) await fbSignOut(firebaseAuth()).catch(() => {}); // 許可外は即サインアウト
        this.current = this.restoreCachedUser();
        listener(this.current);
      }
    });
  }

  async signInWithGoogle(): Promise<User> {
    const auth = firebaseAuth();
    await setPersistence(auth, indexedDBLocalPersistence).catch(() => setPersistence(auth, browserLocalPersistence));
    const cred = await signInWithPopup(auth, makeProvider());
    if (!isAllowedUser(cred.user.email)) {
      await fbSignOut(firebaseAuth());
      throw new Error('このアカウントはこのアプリを利用できません');
    }
    const user = toAppUser(cred.user);
    this.current = user;
    this.rememberCachedUser(user);
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
    await setPersistence(auth, indexedDBLocalPersistence).catch(() => setPersistence(auth, browserLocalPersistence));
    const cred = await signInWithPopup(auth, makeProvider(true));
    if (!isAllowedUser(cred.user.email)) {
      await fbSignOut(firebaseAuth());
      throw new Error('このアカウントはこのアプリを利用できません');
    }
    const oauth = GoogleAuthProvider.credentialFromResult(cred);
    this.rememberGoogleAccessToken(oauth?.accessToken ?? null);
    const user = toAppUser(cred.user);
    this.current = user;
    this.rememberCachedUser(user);
    await this.users.upsert(user).catch(() => {});
    // 連携直後に自動同期をキック。
    if (this.googleAccessToken && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('gcal-connected'));
    }
    return this.googleAccessToken != null;
  }

  isGoogleCalendarConnected(): boolean {
    return this.googleAccessToken != null;
  }

  async signOut(): Promise<void> {
    this.current = null;
    this.rememberCachedUser(null);
    this.rememberGoogleAccessToken(null);
    await fbSignOut(firebaseAuth());
  }
}
