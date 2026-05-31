// =====================================================================
// 環境変数を一箇所に集約。許可ユーザー判定と役割判定の単一ソース。
// =====================================================================

import type { UserRole } from '@/types';

const env = import.meta.env;

const partnerEmail = (env.VITE_PARTNER_EMAIL ?? env.VITE_BOYFRIEND_EMAIL ?? 'me@example.com').toLowerCase();
const rebeccaEmail = (env.VITE_REBECCA_EMAIL ?? env.VITE_GIRLFRIEND_EMAIL ?? 'rebecca@example.com').toLowerCase();

export const APP_CONFIG = {
  fixedCoupleId: env.VITE_FIXED_COUPLE_ID ?? 'couple-main',
  partnerEmail,
  rebeccaEmail,
  allowedEmails: [partnerEmail, rebeccaEmail],
  appVersion: '0.3.0',
  buildNumber: 3,
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
