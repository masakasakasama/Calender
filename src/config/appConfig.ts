import type { UserRole } from '@/types';

// =====================================================================
// 環境変数を一箇所に集約。許可ユーザー判定とバックエンド選択の単一ソース。
// =====================================================================

const env = import.meta.env;

export const APP_CONFIG = {
  fixedCoupleId: env.VITE_FIXED_COUPLE_ID ?? 'couple-main',
  boyfriendEmail: (env.VITE_BOYFRIEND_EMAIL ?? 'boyfriend@example.com').toLowerCase(),
  girlfriendEmail: (env.VITE_GIRLFRIEND_EMAIL ?? 'rebecca@example.com').toLowerCase(),
  backend: (env.VITE_BACKEND ?? 'mock') as 'mock' | 'firebase',
  appVersion: '0.1.0',
  buildNumber: 1,
} as const;

/**
 * メールアドレスから許可ユーザー判定とロール判定を行う。
 * 本番の Google ログインでも、MVP のユーザー切り替えでも、
 * 最終的にここを通すことで「許可された2人以外は使えない」を一元管理する。
 */
export function resolveRole(email: string | null | undefined): UserRole | null {
  if (!email) return null;
  const e = email.toLowerCase();
  if (e === APP_CONFIG.boyfriendEmail) return 'boyfriend';
  if (e === APP_CONFIG.girlfriendEmail) return 'rebecca';
  return null;
}

export function isAllowedUser(email: string | null | undefined): boolean {
  return resolveRole(email) !== null;
}
