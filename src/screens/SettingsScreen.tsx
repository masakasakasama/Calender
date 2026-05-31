import type { User } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';
import { useUpdate } from '@/hooks/useUpdate';
import { useSync } from '@/hooks/useSync';
import { useNotifications } from '@/hooks/useNotifications';
import { services } from '@/services/container';

export function SettingsScreen({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const { state, applyUpdate } = useUpdate();
  const { last, online } = useSync();
  const { permission, requestPermission } = useNotifications();

  const config = services.settingsRepo.getAppConfig();

  return (
    <div>
      <div className="section-title">アカウント</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="set-row"><span>表示名</span><span className="v">{user.displayName}</span></div>
        <div className="set-row"><span>メール</span><span className="v">{user.email}</span></div>
        <div className="set-row"><span>アカウント</span><span className="v">{user.role === 'rebecca' ? 'レベッカ' : '共有'}</span></div>
        <div className="set-row">
          <span>接続</span>
          <span className="v">{services.backendName === 'firebase' ? 'Firebase（クラウド同期）' : 'デモ（端末内）'}</span>
        </div>
      </div>

      <div className="section-title">通知</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="set-row">
          <span>通知許可</span>
          <span className="v">{permission === 'granted' ? '許可済み' : permission === 'denied' ? '拒否' : '未設定'}</span>
        </div>
        {permission !== 'granted' && (
          <button className="btn" style={{ marginTop: 10 }} onClick={requestPermission}>通知を許可する</button>
        )}
      </div>

      <div className="section-title">同期</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="set-row"><span>接続状態</span><span className="v">{online ? 'オンライン' : 'オフライン'}</span></div>
        <div className="set-row"><span>共有カレンダーID</span><span className="v">{config.sharedCalendarId ?? '未設定'}</span></div>
        <div className="set-row"><span>共有アカウント</span><span className="v">{APP_CONFIG.partnerEmail}</span></div>
        <div className="set-row"><span>レベッカ</span><span className="v">{APP_CONFIG.rebeccaEmail}</span></div>
        <div className="set-row"><span>最終同期</span><span className="v">{last ? new Date(last.at).toLocaleString() : '—'}</span></div>
      </div>

      <div className="section-title">アプリ</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="set-row"><span>バージョン</span><span className="v">{APP_CONFIG.fullVersion}</span></div>
        <div className="set-row"><span>更新</span><span className="v">{state?.updateAvailable ? '利用可能' : '最新'}</span></div>
        {state?.updateAvailable && (
          <button className="btn" style={{ marginTop: 10 }} onClick={() => applyUpdate()}>今すぐ更新</button>
        )}
      </div>

      <button className="btn ghost" onClick={onSignOut}>ログアウト</button>
    </div>
  );
}
