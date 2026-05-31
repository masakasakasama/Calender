import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG } from '@/config/appConfig';

// 固定URLでアクセスし、Googleログイン（本番）またはユーザー切替（MVP）。
// 許可された2人以外は resolveRole で弾かれる。
export function LoginScreen() {
  const { signInWithGoogle, signInAsRole } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    }
  };

  return (
    <div className="login">
      <div className="logo">💜</div>
      <h2>Couple Calendar</h2>
      <p>
        2人だけの共有カレンダー。<br />
        Googleログインしたメールアドレスで<br />彼氏 / レベッカを自動判定します。
      </p>

      <button className="btn" onClick={() => run(signInWithGoogle)}>
        Googleでログイン
      </button>

      <div className="or">― MVP: ユーザー切り替え ―</div>
      <div className="switch">
        <button className="btn secondary" onClick={() => run(() => signInAsRole('boyfriend'))}>
          彼氏として入る
        </button>
        <button className="btn rebecca" onClick={() => run(() => signInAsRole('rebecca'))}>
          レベッカとして入る
        </button>
      </div>

      {error && <p style={{ color: 'var(--err)', fontSize: 13 }}>{error}</p>}

      <p className="muted" style={{ marginTop: 18 }}>
        許可ユーザー: {APP_CONFIG.boyfriendEmail} / {APP_CONFIG.girlfriendEmail}
      </p>
    </div>
  );
}
