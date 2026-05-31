import type { User } from '@/types';
import { useRebeccaCalendars } from '@/hooks/useRebeccaCalendars';
import { EventCard } from '@/components/calendar/EventCard';
import { eventDisplayColor } from '@/utils/eventStyle';

// レベッカ画面（レベッカ本人のみアクセス可）。
// 既存Googleカレンダー一覧の表示/同期選択 → 予定一覧 → 共有。
export function RebeccaScreen({ user }: { user: User }) {
  const { calendars, settings, events, syncMode, loading, error, needsConnect, connect, toggleVisible, toggleSync, isShared, shareEvent, unshareEvent } =
    useRebeccaCalendars(user.userId);

  const colorOf = (ev: Parameters<typeof eventDisplayColor>[0]) =>
    ev.color ?? calendars.find((c) => c.googleCalendarId === ev.sourceGoogleCalendarId)?.calendarColor ?? eventDisplayColor(ev);
  const lastGoogleSyncAt = settings
    .map((s) => s.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const syncLabel = syncMode === 'live' ? 'Google連携中' : syncMode === 'cached' ? 'キャッシュ表示中' : '未連携';

  // 未連携: 自動でポップアップせず、ボタンで1回だけ連携する。
  if (needsConnect) {
    return (
      <div>
        <div className="notice">
          🌸 レベッカのGoogleカレンダーを読み込むには、最初に一度だけ連携が必要です。
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 14 }}>
            「連携する」を押すとGoogleの画面が開きます。<br />一度連携すれば、このセッション中はもう聞かれません。
          </p>
          <button className="btn" onClick={connect}>Googleカレンダーを連携する</button>
          {error && <p className="login-error" style={{ marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="notice">
        🌸 レベッカの既存Googleカレンダーから、共有したい予定だけを選んでふたりのカレンダーに追加できます。
      </div>
      {error && <div className="notice error">{error}</div>}
      <div className="notice">
        Google同期: {syncLabel}
        {lastGoogleSyncAt ? ` / 最終取得 ${new Date(lastGoogleSyncAt).toLocaleString()}` : ' / まだ取得なし'}
      </div>

      <div className="section-title">既存Googleカレンダー（表示 / 同期）</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {loading ? (
          <div className="muted">読み込み中…</div>
        ) : (
          settings.map((s) => (
            <div className="toggle-row" key={s.googleCalendarId}>
              <div className="cal-name">
                <span className="swatch" style={{ background: s.calendarColor }} />
                {s.calendarName}
              </div>
              <div className="toggles">
                <label className="toggle">
                  <small>表示</small>
                  <input
                    type="checkbox"
                    checked={s.visibleInApp}
                    disabled={!s.syncEnabled}
                    onChange={(e) => toggleVisible(s, e.target.checked)}
                  />
                  <span className="track" />
                </label>
                <label className="toggle">
                  <small>同期</small>
                  <input type="checkbox" checked={s.syncEnabled} onChange={(e) => toggleSync(s, e.target.checked)} />
                  <span className="track" />
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-title">予定一覧（共有する予定を選ぶ）</div>
      {events.length === 0 ? (
        <div className="list-empty">表示対象カレンダーを選ぶと予定が出ます</div>
      ) : (
        events
          .slice()
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((ev) => {
            const shared = isShared(ev);
            return (
              <EventCard
                key={ev.appEventId}
                event={ev}
                accent={colorOf(ev)}
                right={
                  shared ? (
                    <button className="btn sm secondary" onClick={() => unshareEvent(ev)}>
                      共有解除
                    </button>
                  ) : (
                    <button className="btn sm rebecca" onClick={() => shareEvent(ev)}>
                      共有する
                    </button>
                  )
                }
              />
            );
          })
      )}
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
        「共有する」を押すと、その予定だけが共有カレンダーにコピーされます。
        <br />
        共有中の予定: {events.filter(isShared).length} 件
      </p>
    </div>
  );
}
