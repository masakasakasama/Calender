import { useUpdate } from '@/hooks/useUpdate';

// 「新しいバージョンがあります。更新しますか」バナー。
// 強制更新(requiredUpdate)時は UpdateService 側が自動適用するため、
// ここは任意更新の提示が主目的。
export function UpdateBanner() {
  const { state, applyUpdate } = useUpdate();
  if (!state?.updateAvailable) return null;

  return (
    <div className="banner">
      <span style={{ flex: 1 }}>
        新しいバージョン {state.latestVersion ?? ''} があります。更新しますか？
      </span>
      <button className="btn" onClick={() => applyUpdate()}>更新</button>
    </div>
  );
}
