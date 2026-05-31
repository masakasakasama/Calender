import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { User } from '@/types';
import { firebaseDb } from '@/services/firebase/firebaseApp';
import type { IUsersRepository } from '@/repositories/users/IUsersRepository';

const COL = 'users';

export class FirestoreUsersRepository implements IUsersRepository {
  private cache: User[] = [];
  private listeners = new Set<(u: User[]) => void>();

  constructor() {
    onSnapshot(collection(firebaseDb(), COL), (snap) => {
      this.cache = snap.docs.map((d) => d.data() as User);
      this.listeners.forEach((l) => l(this.cache));
    });
  }

  subscribe(listener: (users: User[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.cache);
    return () => this.listeners.delete(listener);
  }

  getById(userId: string): User | undefined {
    return this.cache.find((u) => u.userId === userId);
  }

  async upsert(user: User): Promise<User> {
    const next = { ...user, updatedAt: new Date().toISOString() };
    await setDoc(doc(firebaseDb(), COL, user.userId), next, { merge: true });
    return next;
  }

  async setNotificationEnabled(userId: string, enabled: boolean): Promise<void> {
    await setDoc(
      doc(firebaseDb(), COL, userId),
      { notificationEnabled: enabled, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  }
}
