import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useGoogleSync } from '@/hooks/useGoogleSync';
import { LoginScreen } from '@/screens/LoginScreen';
import { SharedScreen } from '@/screens/SharedScreen';
import { RebeccaScreen } from '@/screens/RebeccaScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { PlanScreen } from '@/screens/PlanScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { UpdateBanner } from '@/components/pwa/UpdateBanner';
import { InstallHint } from '@/components/pwa/InstallHint';
import { CloudMascot } from '@/components/CloudMascot';

type Tab = 'shared' | 'rebecca' | 'add' | 'plan' | 'notifications' | 'settings';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('shared');
  const [openAdd, setOpenAdd] = useState(false);
  const { unreadCount } = useNotifications();
  // レベッカのGoogle予定を自動同期（タブを開かなくても動く）。
  useGoogleSync(user);

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
        {activeTab === 'shared' && (
          <SharedScreen user={user} openAdd={openAdd} onAddHandled={() => setOpenAdd(false)} />
        )}
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
