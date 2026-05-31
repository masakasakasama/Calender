import { useEffect, useState } from 'react';

// ホーム画面追加（PWA インストール）の導線。
// Android/Chrome は beforeinstallprompt、iOS Safari は手順案内。
export function InstallHint() {
  const [deferred, setDeferred] = useState<any>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('install_dismissed') === '1');
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone || dismissed) return null;
  if (!deferred && !isIos) return null;

  const close = () => {
    sessionStorage.setItem('install_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="banner install">
      {deferred ? (
        <>
          <span style={{ flex: 1 }}>ホーム画面に追加して使えます</span>
          <button className="btn" onClick={async () => { await deferred.prompt(); close(); }}>追加</button>
          <button className="btn" onClick={close}>×</button>
        </>
      ) : (
        <>
          <span style={{ flex: 1 }}>共有 → 「ホーム画面に追加」でアプリとして使えます</span>
          <button className="btn" onClick={close}>×</button>
        </>
      )}
    </div>
  );
}
