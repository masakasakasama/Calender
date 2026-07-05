import { useState } from 'react';

// 旅行プラン。外部サイト（Trip_Plan）をアプリ内に埋め込み表示。
// 万一 iframe が読めない環境でも、別タブで開けるボタンを用意。
const TRIP_URL = 'https://masakasakasama.github.io/Trip_Plan/';

export function TripScreen() {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="trip-screen">
      <div className="trip-bar">
        <span className="trip-title">✈️ 旅行プラン</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn sm secondary" onClick={() => { setFailed(false); setReloadKey((k) => k + 1); }}>
            🔄 更新
          </button>
          <a className="btn sm" href={TRIP_URL} target="_blank" rel="noopener noreferrer">↗ 別タブ</a>
        </div>
      </div>

      {failed ? (
        <div className="card" style={{ margin: '12px 0' }}>
          <p className="muted" style={{ marginBottom: 10 }}>
            ここに埋め込めませんでした。下のボタンから開いてください。
          </p>
          <a className="btn" href={TRIP_URL} target="_blank" rel="noopener noreferrer">旅行プランを開く ↗</a>
        </div>
      ) : (
        <iframe
          key={reloadKey}
          className="trip-frame"
          src={TRIP_URL}
          title="旅行プラン"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
