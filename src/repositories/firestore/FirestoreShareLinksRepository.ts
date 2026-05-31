import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { ShareLink } from '@/types';
import { firebaseDb } from '@/services/firebase/firebaseApp';
import type { IShareLinksRepository } from '@/repositories/shareLinks/IShareLinksRepository';

const COL = 'share_links';

export class FirestoreShareLinksRepository implements IShareLinksRepository {
  private cache: ShareLink[] = [];
  private listeners = new Set<(l: ShareLink[]) => void>();

  constructor() {
    onSnapshot(collection(firebaseDb(), COL), (snap) => {
      this.cache = snap.docs.map((d) => d.data() as ShareLink);
      this.listeners.forEach((l) => l(this.cache));
    });
  }

  subscribe(listener: (links: ShareLink[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.cache);
    return () => this.listeners.delete(listener);
  }

  getAll(): ShareLink[] {
    return this.cache;
  }

  findActiveBySource(sourceGoogleEventId: string): ShareLink | undefined {
    return this.cache.find((l) => l.sourceGoogleEventId === sourceGoogleEventId && l.status === 'active');
  }

  async upsert(link: ShareLink): Promise<void> {
    await setDoc(doc(firebaseDb(), COL, link.id), link, { merge: true });
  }

  async markRemoved(id: string): Promise<void> {
    await setDoc(
      doc(firebaseDb(), COL, id),
      { status: 'removed', unsharedAt: new Date().toISOString() },
      { merge: true },
    );
  }
}
