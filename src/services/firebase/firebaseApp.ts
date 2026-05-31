import { initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// =====================================================================
// Firebase 初期化。env に設定値が揃っているときだけ有効化する。
// 揃っていなければ isFirebaseConfigured() が false を返し、
// container.ts はモック実装にフォールバックする。
// （Firebase Web の apiKey はクライアント公開前提の値）
// =====================================================================
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function firebaseApp(): FirebaseApp {
  if (!_app) _app = initializeApp(cfg as Record<string, string>);
  return _app;
}

export function firebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(firebaseApp());
    void setPersistence(_auth, browserLocalPersistence);
  }
  return _auth;
}

export function firebaseDb(): Firestore {
  if (!_db) _db = getFirestore(firebaseApp());
  return _db;
}
