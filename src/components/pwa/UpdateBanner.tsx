import { useUpdate } from '@/hooks/useUpdate';

// 新しいバージョンを検知したら確認せず自動更新する。
// ここでは「更新中」を一瞬表示するだけ（すぐ自動リロードされる）。
export function UpdateBanner() {
  const { state } = useUpdate();
  if (!state?.updateAvailable) return null;

  return (
    <div className="banner">
      <span style={{ flex: 1 }}>新しいバージョンに更新しています…</span>
    </div>
  );
}
