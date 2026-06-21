import { collection, doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import type { ShareLink } from '@/types';
import { firebaseDb } from '@/services/firebase/firebaseApp';
import type { IShareLinksRepository } from '@/repositories/shareLinks/IShareLinksRepository';
import { localStore } from '@/repositories/db/LocalStore';

const COL = 'share_links';
const CACHE_KEY = 'firestore_share_links_cache';

export class FirestoreShareLinksRepository implements IShareLinksRepository {
  private cache: ShareLink[] = localStore.get<ShareLink[]>(CACHE_KEY, []);
  private listeners = new Set<(l: ShareLink[]) => void>();
  private unsubscribe: Unsubscribe | null = null;

  private ensureSubscribed() {
    if (this.unsubscribe) return;
    this.unsubscribe = onSnapshot(collection(firebaseDb(), COL), (snap) => {
      this.cache = snap.docs.map((d) => d.data() as ShareLink);
      localStore.set(CACHE_KEY, this.cache);
      this.listeners.forEach((l) => l(this.cache));
    });
  }

  subscribe(listener: (links: ShareLink[]) => void): () => void {
    this.ensureSubscribed();
    this.listeners.add(listener);
    listener(this.cache);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  getAll(): ShareLink[] {
    return this.cache;
  }

  findActiveBySource(sourceGoogleEventId: string, sourceGoogleCalendarId?: string | null): ShareLink | undefined {
    return this.cache.find(
      (l) =>
        l.sourceGoogleEventId === sourceGoogleEventId &&
        (!sourceGoogleCalendarId || l.sourceGoogleCalendarId === sourceGoogleCalendarId) &&
        l.status === 'active',
    );
  }

  async upsert(link: ShareLink): Promise<void> {
    this.cache = [...this.cache.filter((l) => l.id !== link.id), link];
    localStore.set(CACHE_KEY, this.cache);
    await setDoc(doc(firebaseDb(), COL, link.id), link, { merge: true });
  }

  async markRemoved(id: string): Promise<void> {
    this.cache = this.cache.map((l) => (l.id === id ? { ...l, status: 'removed', unsharedAt: new Date().toISOString() } : l));
    localStore.set(CACHE_KEY, this.cache);
    await setDoc(
      doc(firebaseDb(), COL, id),
      { status: 'removed', unsharedAt: new Date().toISOString() },
      { merge: true },
    );
  }
}
