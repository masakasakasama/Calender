import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

// 固定URLでアクセスし、Googleログイン。許可された2人以外は利用不可。
// Firebase 未設定のときは「ためしに入る」(モック) も使える。
export function LoginScreen() {
  const { signInWithGoogle, signInMock, backendName } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="logo-badge">💗</div>
      <h2>ふたりのカレンダー</h2>
      <p>
        ふたりだけの予定をひとつに。<br />
        Googleでログインしてはじめましょう。
      </p>

      <div className="switch">
        <button className="btn" disabled={busy} onClick={() => run(signInWithGoogle)}>
          <span style={{ fontSize: 16 }}>🟦</span> Googleでログイン
        </button>

        {backendName === 'mock' && (
          <button className="btn ghost" disabled={busy} onClick={() => run(signInMock)}>
            ためしに入る（デモ）
          </button>
        )}
      </div>

      {error && <p className="login-error">{error}</p>}

      <p className="login-note">
        {backendName === 'firebase'
          ? '許可されたふたりのアカウントだけが使えます'
          : 'デモモードです（データはこの端末だけに保存されます）'}
      </p>
    </div>
  );
}
