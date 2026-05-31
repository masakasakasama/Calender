import type { User } from '@/types';

export interface IUsersRepository {
  subscribe(listener: (users: User[]) => void): () => void;
  getById(userId: string): User | undefined;
  upsert(user: User): Promise<User>;
  setNotificationEnabled(userId: string, enabled: boolean): Promise<void>;
}
