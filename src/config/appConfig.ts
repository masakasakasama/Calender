// =====================================================================
// 環境変数を一箇所に集約。許可ユーザー判定とバックエンド選択の単一ソース。
// 「彼氏/レベッカ」の役割は廃止。許可された2つのメールアドレスだけが使える。
// =====================================================================

const env = import.meta.env;

export const APP_CONFIG = {
  fixedCoupleId: env.VITE_FIXED_COUPLE_ID ?? 'couple-main',
  // 許可する2人のメール（順不同）。本番では Google ログインのメールで判定。
  allowedEmails: [
    (env.VITE_BOYFRIEND_EMAIL ?? 'me@example.com').toLowerCase(),
    (env.VITE_GIRLFRIEND_EMAIL ?? 'rebecca@example.com').toLowerCase(),
  ],
  appVersion: '0.2.0',
  buildNumber: 2,
} as const;

/** 許可された2人のメール以外は利用不可。 */
export function isAllowedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return APP_CONFIG.allowedEmails.includes(email.toLowerCase());
}
