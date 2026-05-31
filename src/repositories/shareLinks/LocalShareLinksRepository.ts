import type { ShareLink } from '@/types';
import { localStore } from '@/repositories/db/LocalStore';
import type { IShareLinksRepository } from './IShareLinksRepository';

const KEY = 'share_links';

export class LocalShareLinksRepository implements IShareLinksRepository {
  private read(): ShareLink[] {
    return localStore.get<ShareLink[]>(KEY, []);
  }
  private write(links: ShareLink[]): void {
    localStore.set(KEY, links);
  }

  subscribe(listener: (links: ShareLink[]) => void): () => void {
    return localStore.subscribe<ShareLink[]>(KEY, [], listener);
  }

  getAll(): ShareLink[] {
    return this.read();
  }

  findActiveBySource(sourceGoogleEventId: string): ShareLink | undefined {
    return this.read().find((l) => l.sourceGoogleEventId === sourceGoogleEventId && l.status === 'active');
  }

  async upsert(link: ShareLink): Promise<void> {
    const all = this.read();
    const idx = all.findIndex((l) => l.id === link.id);
    if (idx >= 0) all[idx] = link;
    else all.push(link);
    this.write(all);
  }

  async markRemoved(id: string): Promise<void> {
    const all = this.read();
    const idx = all.findIndex((l) => l.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], status: 'removed', unsharedAt: new Date().toISOString() };
    this.write(all);
  }
}
