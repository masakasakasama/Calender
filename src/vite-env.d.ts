/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BOYFRIEND_EMAIL?: string;
  readonly VITE_GIRLFRIEND_EMAIL?: string;
  readonly VITE_PARTNER_EMAIL?: string;
  readonly VITE_REBECCA_EMAIL?: string;
  readonly VITE_FIXED_COUPLE_ID?: string;
  readonly VITE_BACKEND?: 'mock' | 'firebase';
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_SCOPES?: string;
  readonly VITE_FCM_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
