// =====================================================================
// 環境変数を一箇所に集約。許可ユーザー判定と役割判定の単一ソース。
// =====================================================================

import type { UserRole } from '@/types';

const env = import.meta.env;

const partnerEmail = (env.VITE_PARTNER_EMAIL ?? env.VITE_BOYFRIEND_EMAIL ?? 'me@example.com').toLowerCase();
const rebeccaEmail = (env.VITE_REBECCA_EMAIL ?? env.VITE_GIRLFRIEND_EMAIL ?? 'rebecca@example.com').toLowerCase();

// CI から渡されるビルド情報（ローカルでは 'dev'）。デプロイごとに変わる。
const buildNumber = env.VITE_BUILD_NUMBER ?? 'dev';
const commitShort = (env.VITE_COMMIT_SHA ?? '').slice(0, 7);

// アプリのバージョン。変更のたびにここを上げる（単一ソース）。
const appVersion = '0.5.0';

export const APP_CONFIG = {
  fixedCoupleId: env.VITE_FIXED_COUPLE_ID ?? 'couple-main',
  partnerEmail,
  rebeccaEmail,
  allowedEmails: [partnerEmail, rebeccaEmail],
  appVersion,
  buildNumber,
  commitShort,
  // 例: "0.4.0 (build 42 · a1b2c3d)" / ローカルは "0.4.0 (dev)"
  fullVersion:
    commitShort ? `${appVersion} (build ${buildNumber} · ${commitShort})` : `${appVersion} (${buildNumber})`,
} as const;

/** 許可された2人のメール以外は利用不可。 */
export function isAllowedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return APP_CONFIG.allowedEmails.includes(email.toLowerCase());
}

export function resolveRole(email: string | null | undefined): UserRole | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (lower === APP_CONFIG.rebeccaEmail) return 'rebecca';
  if (lower === APP_CONFIG.partnerEmail) return 'partner';
  return null;
}
