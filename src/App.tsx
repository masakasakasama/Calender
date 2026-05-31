import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { LoginScreen } from '@/screens/LoginScreen';
import { SharedScreen } from '@/screens/SharedScreen';
import { RebeccaScreen } from '@/screens/RebeccaScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { UpdateBanner } from '@/components/pwa/UpdateBanner';
import { InstallHint } from '@/components/pwa/InstallHint';

type Tab = 'shared' | 'rebecca' | 'add' | 'notifications' | 'settings';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('shared');
  const [openAdd, setOpenAdd] = useState(false);
  const { unreadCount } = useNotifications();

  if (loading && !user) {
    return (
      <div className="app">
        <UpdateBanner />
        <div className="splash">
          <div className="logo-badge">💗</div>
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
  const tabs: { key: Tab; label: string; ico: string }[] = [
    { key: 'shared', label: '共有', ico: '🗓️' },
    ...(isRebecca ? [{ key: 'rebecca' as Tab, label: 'レベッカ', ico: '🌸' }] : []),
    { key: 'add', label: '追加', ico: '＋' },
    { key: 'notifications', label: '通知', ico: '🔔' },
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
        <h1>
          <span className="appbar-heart">💗</span> ふたりのカレンダー
        </h1>
        <div className="who">
          {user.displayName}
          <span className={`badge-role ${user.role}`}>{isRebecca ? 'レベッカ' : '共有'}</span>
        </div>
      </header>

      <main className="content">
        {activeTab === 'shared' && (
          <SharedScreen user={user} openAdd={openAdd} onAddHandled={() => setOpenAdd(false)} />
        )}
        {activeTab === 'rebecca' && isRebecca && <RebeccaScreen user={user} />}
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
              {t.key === 'notifications' && unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
