import type { User } from '@/types';
import { localStore } from '@/repositories/db/LocalStore';
import type { IUsersRepository } from './IUsersRepository';

const KEY = 'users';

export class LocalUsersRepository implements IUsersRepository {
  private read(): User[] {
    return localStore.get<User[]>(KEY, []);
  }
  private write(users: User[]): void {
    localStore.set(KEY, users);
  }

  subscribe(listener: (users: User[]) => void): () => void {
    return localStore.subscribe<User[]>(KEY, [], listener);
  }

  getByRole(role: User['role']): User | undefined {
    return this.read().find((u) => u.role === role);
  }

  async upsert(user: User): Promise<User> {
    const all = this.read();
    const now = new Date().toISOString();
    const idx = all.findIndex((u) => u.userId === user.userId);
    const next = { ...user, updatedAt: now };
    if (idx >= 0) all[idx] = next;
    else all.push({ ...next, createdAt: next.createdAt || now });
    this.write(all);
    return next;
  }

  async setNotificationEnabled(userId: string, enabled: boolean): Promise<void> {
    const all = this.read();
    const idx = all.findIndex((u) => u.userId === userId);
    if (idx < 0) return;
    all[idx] = { ...all[idx], notificationEnabled: enabled, updatedAt: new Date().toISOString() };
    this.write(all);
  }
}
