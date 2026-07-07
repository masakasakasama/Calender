import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useGoogleSync } from '@/hooks/useGoogleSync';
import { useGoogleSharedCalendarSync } from '@/hooks/useGoogleSharedCalendarSync';
import { useSeedEvents } from '@/hooks/useSeedEvents';
import { services } from '@/services/container';
import { LoginScreen } from '@/screens/LoginScreen';
import { SharedScreen } from '@/screens/SharedScreen';
import { TripScreen } from '@/screens/TripScreen';
import { RebeccaScreen } from '@/screens/RebeccaScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PlanScreen } from '@/screens/PlanScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { UpdateBanner } from '@/components/pwa/UpdateBanner';
import { InstallHint } from '@/components/pwa/InstallHint';
import { CloudMascot } from '@/components/CloudMascot';

type Tab = 'shared' | 'trip' | 'rebecca' | 'add' | 'plan' | 'notifications' | 'settings';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('shared');
  const [openAdd, setOpenAdd] = useState(false);
  const [searchPulse, setSearchPulse] = useState(0);
  const { unreadCount } = useNotifications();
  // レベッカのGoogle予定を自動同期（タブを開かなくても動く）。
  useGoogleSync(user);
  useGoogleSharedCalendarSync(user);
  // 共有Google同期が失敗している間、特定の共有予定を1回だけ投入（追加のみ）。
  useSeedEvents(user);

  const [cloudError, setCloudError] = useState<string | null>(null);
  // ログイン時に、端末ローカルだけの予定を自動でクラウドへ送り直す（取りこぼし防止）。
  // 失敗したら理由を画面に出す（原因特定のため）。
  useEffect(() => {
    if (user && services.backendName === 'firebase') {
      services.eventsRepo
        .forceResync?.()
        .then((err) => setCloudError(err ?? null))
        .catch((e) => setCloudError(e instanceof Error ? e.message : String(e)));
    }
  }, [user?.userId]);

  if (loading && !user) {
    return (
      <div className="app">
        <UpdateBanner />
        <div className="splash">
          <div className="logo-badge"><CloudMascot size={92} /></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <UpdateBanner />
        <LoginScreen />
      </div>
    );
  }

  const isRebecca = user.role === 'rebecca';

  // レベッカ本人だけが「レベッカ」画面を使える。共有画面は2人共通。
  // 「通知」はヘッダーのベルに移動し、その枠を「プラン」に入れ替え。
  const tabs: { key: Tab; label: string; ico: string }[] = [
    { key: 'shared', label: '共有', ico: '🗓️' },
    { key: 'trip', label: '旅行', ico: '✈️' },
    ...(isRebecca ? [{ key: 'rebecca' as Tab, label: 'レベッカ', ico: '🌸' }] : []),
    { key: 'add', label: '追加', ico: '＋' },
    { key: 'plan', label: 'プラン', ico: '💝' },
    { key: 'settings', label: '設定', ico: '⚙️' },
  ];

  const onTab = (key: Tab) => {
    if (key === 'add') {
      setOpenAdd(true);
      setTab('shared');
    } else {
      setTab(key);
    }
  };

  const activeTab: Tab = !isRebecca && tab === 'rebecca' ? 'shared' : tab;

  return (
    <div className="app">
      <UpdateBanner />
      <InstallHint />

      <header className="appbar">
        <h1 className="font-hand">
          <CloudMascot size={30} /> calender
        </h1>
        {activeTab === 'shared' && (
          <button className="appbar-search" onClick={() => setSearchPulse((value) => value + 1)} aria-label="予定を検索">
            🔍
          </button>
        )}
        <div className="appbar-right">
          <button className="bell-btn" onClick={() => setTab('notifications')} aria-label="通知">
            🔔
            {unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
          </button>
          <div className="who">
            {user.displayName}
            <span className={`badge-role ${user.role}`}>{isRebecca ? 'レベッカ' : '共有'}</span>
          </div>
        </div>
      </header>

      <main className="content">
        {cloudError && (
          <div className="notice error" style={{ marginBottom: 12 }}>
            ⚠️ クラウド保存エラー：{cloudError}
          </div>
        )}
        {activeTab === 'shared' && (
          <SharedScreen user={user} openAdd={openAdd} searchPulse={searchPulse} onAddHandled={() => setOpenAdd(false)} />
        )}
        {activeTab === 'trip' && <TripScreen />}
        {activeTab === 'rebecca' && isRebecca && <RebeccaScreen user={user} />}
        {activeTab === 'plan' && <PlanScreen user={user} />}
        {activeTab === 'notifications' && <NotificationsScreen />}
        {activeTab === 'settings' && <SettingsScreen user={user} onSignOut={signOut} />}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => {
          const isAdd = t.key === 'add';
          return (
            <button
              key={t.key}
              className={!isAdd && activeTab === t.key ? 'active' : ''}
              onClick={() => onTab(t.key)}
            >
              <span className={isAdd ? 'ico add' : 'ico'}>{t.ico}</span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
