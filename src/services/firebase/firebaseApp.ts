import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  setPersistence,
  signInAnonymously,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

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
let _functions: Functions | null = null;
let _anonymousSignIn: Promise<FirebaseUser> | null = null;

export function firebaseApp(): FirebaseApp {
  if (!_app) _app = initializeApp(cfg as Record<string, string>);
  return _app;
}

export function firebaseAuth(): Auth {
  if (!_auth) {
    try {
      _auth = initializeAuth(firebaseApp(), {
        persistence: [browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      _auth = getAuth(firebaseApp());
    }
  }
  return _auth;
}

export async function setDurableAuthPersistence(auth: Auth = firebaseAuth()): Promise<void> {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
    } catch {
      await setPersistence(auth, browserSessionPersistence);
    }
  }
}

// A cached app identity may outlive the Firebase session on Samsung PWAs.
// Shared-event rules explicitly allow anonymous Firebase sessions, so restore
// that transport session silently instead of showing another Google login.
export async function ensureFirebaseSession(): Promise<FirebaseUser> {
  const auth = firebaseAuth();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!_anonymousSignIn) {
    _anonymousSignIn = (async () => {
      await setDurableAuthPersistence(auth);
      return (await signInAnonymously(auth)).user;
    })().finally(() => {
      _anonymousSignIn = null;
    });
  }
  return _anonymousSignIn;
}

export function firebaseDb(): Firestore {
  if (!_db) _db = getFirestore(firebaseApp());
  return _db;
}

// Cloud Functions（AIプラン提案など）。デプロイ先のリージョンに合わせる。
export function firebaseFunctions(): Functions {
  if (!_functions) _functions = getFunctions(firebaseApp(), 'asia-northeast1');
  return _functions;
}
