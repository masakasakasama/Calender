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
  const { unreadCount } = useNotifications(user?.role ?? null);

  if (loading && !user) {
    return (
      <div className="app">
        <UpdateBanner />
        <div className="empty">読み込み中…</div>
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

  // 権限制御: 彼氏は rebecca タブにアクセスできない。
  const tabs: { key: Tab; label: string; ico: string }[] = [
    { key: 'shared', label: '共有', ico: '💜' },
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

  // 彼氏が万一 rebecca タブを指していても遮断。
  const activeTab: Tab = !isRebecca && tab === 'rebecca' ? 'shared' : tab;

  return (
    <div className="app">
      <UpdateBanner />
      <InstallHint />

      <header className="appbar">
        <h1>Couple Calendar</h1>
        <div className="who">
          {user.displayName}
          <span className={`badge-role ${user.role}`}>{isRebecca ? 'レベッカ' : '彼氏'}</span>
        </div>
      </header>

      <main className="content">
        {activeTab === 'shared' && (
          <SharedScreen user={user} openAdd={openAdd} onAddHandled={() => setOpenAdd(false)} />
        )}
        {activeTab === 'rebecca' && isRebecca && <RebeccaScreen user={user} />}
        {activeTab === 'notifications' && <NotificationsScreen user={user} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onSignOut={signOut} />}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={(t.key === 'add' ? false : activeTab === t.key) ? 'active' : ''}
            onClick={() => onTab(t.key)}
          >
            <span className="ico">{t.ico}</span>
            {t.label}
            {t.key === 'notifications' && unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
