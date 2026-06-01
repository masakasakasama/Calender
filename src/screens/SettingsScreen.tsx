import { useRef, useState } from 'react';
import type { CalendarEvent, ShareLink, User } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';
import { useUpdate } from '@/hooks/useUpdate';
import { useSync } from '@/hooks/useSync';
import { useNotifications } from '@/hooks/useNotifications';
import { services } from '@/services/container';
import { fmtYmdHm } from '@/utils/date';

export function SettingsScreen({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const { state, applyUpdate } = useUpdate();
  const { last, online } = useSync();
  const { permission, requestPermission } = useNotifications();

  const config = services.settingsRepo.getAppConfig();
  const googleCalId = config.googleSharedCalendarId ?? APP_CONFIG.googleSharedCalendarId;
  const rebeccaSettings = services.settingsRepo.getRebeccaSettings();
  const hasRebeccaCache = rebeccaSettings.length > 0;
  const lastGoogleSyncAt = rebeccaSettings
    .map((s) => s.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const googleConnectionStatus = services.auth.isGoogleCalendarConnected?.()
    ? '連携済み'
    : hasRebeccaCache
      ? 'キャッシュ使用'
      : user.role === 'rebecca'
        ? '未連携'
        : '不要';
  const [gConnected, setGConnected] = useState<boolean>(services.auth.isGoogleCalendarConnected?.() ?? false);
  const [gBusy, setGBusy] = useState(false);
  const [gErr, setGErr] = useState<string | null>(null);
  const backupInput = useRef<HTMLInputElement | null>(null);

  const connectGoogle = async () => {
    setGErr(null);
    setGBusy(true);
    try {
      const ok = (await services.auth.connectGoogleCalendar?.()) ?? false;
      setGConnected(ok || (services.auth.isGoogleCalendarConnected?.() ?? false));
    } catch (e) {
      setGErr(e instanceof Error ? e.message : 'Google連携に失敗しました');
    } finally {
      setGBusy(false);
    }
  };

  const exportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'calender',
      version: APP_CONFIG.fullVersion,
      events: services.eventsRepo.getAll(),
      shareLinks: services.shareLinksRepo.getAll(),
      appConfig: services.settingsRepo.getAppConfig(),
      rebeccaSettings: services.settingsRepo.getRebeccaSettings(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `calender-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBackup = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text) as {
      events?: CalendarEvent[];
      shareLinks?: ShareLink[];
    };
    for (const ev of data.events ?? []) {
      await services.eventsRepo.upsert(ev);
    }
    for (const link of data.shareLinks ?? []) {
      await services.shareLinksRepo.upsert(link);
    }
  };

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

      {services.backendName === 'firebase' && (
        <>
          <div className="section-title">Googleカレンダー連携</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="set-row">
              <span>共有先カレンダー</span>
              <span className="v">{googleCalId ? '設定済み' : '未設定'}</span>
            </div>
            <div className="set-row">
              <span>この端末の連携</span>
              <span className="v">{googleConnectionStatus}</span>
            </div>
            <div className="set-row">
              <span>Google最終取得</span>
              <span className="v">{lastGoogleSyncAt ? fmtYmdHm(new Date(lastGoogleSyncAt)) : '未取得'}</span>
            </div>
            <p className="muted" style={{ margin: '10px 0' }}>
              レベッカが一度読み込んだGoogle予定はFirestoreに保存されます。普段は再連携なしで開けて、Googleから最新に更新したい時だけ連携します。
            </p>
            {user.role === 'rebecca' && !gConnected && (
              <button className="btn" disabled={gBusy} onClick={connectGoogle}>
                {gBusy ? '連携中…' : 'Googleカレンダーと連携する'}
              </button>
            )}
            {gErr && <p className="login-error" style={{ marginTop: 10 }}>{gErr}</p>}
          </div>
        </>
      )}

      <div className="section-title">同期</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="set-row"><span>接続状態</span><span className="v">{online ? 'オンライン' : 'オフライン'}</span></div>
        <div className="set-row"><span>共有カレンダーID</span><span className="v">{config.sharedCalendarId ?? '未設定'}</span></div>
        <div className="set-row"><span>共有アカウント</span><span className="v">{APP_CONFIG.partnerEmail}</span></div>
        <div className="set-row"><span>レベッカ</span><span className="v">{APP_CONFIG.rebeccaEmail}</span></div>
        <div className="set-row"><span>最終同期</span><span className="v">{last ? fmtYmdHm(new Date(last.at)) : '—'}</span></div>
      </div>

      <div className="section-title">アプリ</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="set-row"><span>バージョン</span><span className="v">{APP_CONFIG.fullVersion}</span></div>
        <div className="set-row"><span>更新</span><span className="v">{state?.updateAvailable ? '利用可能' : '最新'}</span></div>
        {state?.updateAvailable && (
          <button className="btn" style={{ marginTop: 10 }} onClick={() => applyUpdate()}>今すぐ更新</button>
        )}
      </div>

      <div className="section-title">バックアップ</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ marginBottom: 10 }}>予定と共有リンクをJSONで保存/復元できます。</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn secondary" onClick={exportBackup}>書き出し</button>
          <button className="btn secondary" onClick={() => backupInput.current?.click()}>読み込み</button>
        </div>
        <input
          ref={backupInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importBackup(file);
            e.currentTarget.value = '';
          }}
        />
      </div>

      <button className="btn ghost" onClick={onSignOut}>ログアウト</button>
    </div>
  );
}
