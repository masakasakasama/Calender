// =====================================================================
// LocalStore: モック DB。
//   - localStorage に永続化（オフラインキャッシュ相当）
//   - BroadcastChannel + storage イベントで「複数デバイス自動同期」を擬似再現
//   - subscribe() による購読型 API（Firestore onSnapshot 相当）
//
// 本番では FirestoreStore に差し替える。subscribe 型インターフェースを
// 守っているため、上位の Repository / hook はそのまま使える。
// =====================================================================

type Listener<T> = (value: T) => void;

const CHANNEL_NAME = 'couple-calendar-sync';
const STORAGE_PREFIX = 'cc:';

export class LocalStore {
  private channel: BroadcastChannel | null = null;
  private listeners = new Map<string, Set<Listener<unknown>>>();

  constructor() {
    // BroadcastChannel: 同一ブラウザの別タブ間で即時同期。
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev) => {
        const { key } = ev.data ?? {};
        if (typeof key === 'string') this.emit(key);
      };
    }
    // storage イベント: 別ウィンドウ/デバイス(同一オリジン)での変更検知。
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (ev) => {
        if (ev.key && ev.key.startsWith(STORAGE_PREFIX)) {
          this.emit(ev.key.slice(STORAGE_PREFIX.length));
        }
      });
    }
  }

  private storageKey(key: string): string {
    return STORAGE_PREFIX + key;
  }

  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.storageKey(key));
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.storageKey(key), JSON.stringify(value));
    // 自タブには即時通知、他タブ/デバイスには Channel / storage 経由で伝播。
    this.emit(key);
    this.channel?.postMessage({ key });
  }

  /** Firestore onSnapshot 相当。購読すると即座に現在値を1度配信する。 */
  subscribe<T>(key: string, fallback: T, listener: Listener<T>): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    const wrapped: Listener<unknown> = () => listener(this.get<T>(key, fallback));
    this.listeners.get(key)!.add(wrapped);
    // 初回配信
    listener(this.get<T>(key, fallback));
    return () => {
      this.listeners.get(key)?.delete(wrapped);
    };
  }

  private emit(key: string): void {
    this.listeners.get(key)?.forEach((l) => l(undefined));
  }
}

// アプリ全体で共有する単一インスタンス。
export const localStore = new LocalStore();
