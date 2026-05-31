import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { fmtDateTimeRange } from '@/utils/date';

const KIND_LABEL: Record<string, string> = {
  event_added: '追加',
  event_updated: '変更',
  event_deleted: '削除',
  event_shared: '共有',
  reminder: 'リマインダー',
};

export function NotificationsScreen() {
  const { items, permission, requestPermission, markAllRead } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div>
      {permission !== 'granted' && (
        <div className="card soft" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🔔 通知をオンにする</div>
          <p className="muted" style={{ marginBottom: 12 }}>
            予定の追加・変更・共有・リマインダーをお知らせします。ホーム画面に追加した状態がおすすめです。
          </p>
          <button className="btn" onClick={requestPermission}>通知を許可する</button>
        </div>
      )}

      <div className="section-title">通知</div>
      {items.length === 0 ? (
        <div className="list-empty">通知はまだありません</div>
      ) : (
        items.map((n) => (
          <div className={`ntf-item${n.read ? '' : ' unread'}`} key={n.id}>
            <div style={{ flex: 1 }}>
              <div className="nt">[{KIND_LABEL[n.kind] ?? n.kind}] {n.title}</div>
              <div className="nb">{n.body}</div>
              <div className="ntime">{fmtDateTimeRange(n.createdAt, n.createdAt).split('–')[0]}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
