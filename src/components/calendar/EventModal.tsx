import { useState } from 'react';
import type { CalendarEvent, EventVisibility, EventRecurrence } from '@/types';
import { fmtDateTimeRange, fmtAllDayRange, startOfDayIso, endOfDayIso } from '@/utils/date';
import { DateTimeField } from './DateTimeField';
import { EVENT_COLORS, DEFAULT_COLOR, EMOJI_PALETTE, EVENT_CATEGORIES, categoryById, suggestEmoji } from '@/utils/eventStyle';
import { openInMaps } from '@/utils/maps';
import { useSwipeDownClose } from '@/hooks/useSwipeDownClose';
import { PlaceSuggestInput } from '@/components/maps/PlaceSuggestInput';

export interface EventFormValue {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  reminderMinutes: number | null;
  color: string | null;
  emoji: string | null;
  categoryId: string | null;
  mapsPlaceId: string | null;
  recurrence: EventRecurrence | null;
  visibility: EventVisibility;
}

// 予定の詳細表示 + 追加/編集/削除。
export function EventModal({
  event,
  initial,
  readOnly,
  allowPrivate,
  onClose,
  onSave,
  onDelete,
}: {
  event?: CalendarEvent | null;
  initial?: Partial<EventFormValue>;
  readOnly?: boolean;
  allowPrivate?: boolean;
  onClose: () => void;
  onSave?: (v: EventFormValue) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const [editing, setEditing] = useState(!event && !readOnly);
  const initialTitle = event?.title ?? initial?.title ?? '';
  const [v, setV] = useState<EventFormValue>({
    title: initialTitle,
    description: event?.description ?? initial?.description ?? '',
    location: event?.location ?? initial?.location ?? '',
    start: event?.start ?? initial?.start ?? now.toISOString(),
    end: event?.end ?? initial?.end ?? later.toISOString(),
    allDay: event?.allDay ?? initial?.allDay ?? false,
    reminderMinutes: event?.reminderMinutes ?? initial?.reminderMinutes ?? 15,
    color: event?.color ?? initial?.color ?? DEFAULT_COLOR,
    emoji: event?.emoji ?? initial?.emoji ?? suggestEmoji(initialTitle),
    categoryId: event?.categoryId ?? initial?.categoryId ?? 'other',
    mapsPlaceId: event?.mapsPlaceId ?? initial?.mapsPlaceId ?? null,
    recurrence: event?.recurrence ?? initial?.recurrence ?? { frequency: 'none', count: 1 },
    visibility: event?.visibility ?? initial?.visibility ?? 'shared',
  });
  // 絵文字をユーザーが手動変更したら、自動推定で上書きしない。
  const [emojiTouched, setEmojiTouched] = useState(Boolean(event?.emoji));
  const [showEmoji, setShowEmoji] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swipe = useSwipeDownClose(onClose);

  const set = (k: keyof EventFormValue, val: string | number | boolean | EventRecurrence | null) => setV((s) => ({ ...s, [k]: val }));

  const onTitleChange = (title: string) => {
    setV((s) => ({
      ...s,
      title,
      emoji: emojiTouched ? s.emoji : suggestEmoji(title),
    }));
  };

  const pickEmoji = (e: string) => {
    setEmojiTouched(true);
    set('emoji', e);
    setShowEmoji(false);
  };

  const pickCategory = (id: string) => {
    const c = categoryById(id);
    setV((s) => ({
      ...s,
      categoryId: id,
      color: c.color,
      emoji: emojiTouched ? s.emoji : c.emoji,
    }));
  };

  const submit = async () => {
    if (!v.title.trim() || !onSave) return;
    setError(null);
    setSaving(true);
    try {
      // 終日なら開始=その日の0:00、終了=その日の23:59に揃える。
      const payload: EventFormValue = v.allDay
        ? { ...v, start: startOfDayIso(v.start), end: endOfDayIso(v.end), reminderMinutes: v.reminderMinutes }
        : v;
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="sheet"
        ref={swipe.ref}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="grab" />
        {editing ? (
          <>
            <h3>{event ? '予定を編集' : '予定を追加'}</h3>

            <div className="field">
              <label>タイトル</label>
              <div className="title-row">
                <button type="button" className="emoji-btn" onClick={() => setShowEmoji((s) => !s)} aria-label="絵文字を変更">
                  {v.emoji ?? '📌'}
                </button>
                <input value={v.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="例: 映画デート" autoFocus />
              </div>
              {showEmoji && (
                <div className="emoji-grid">
                  {EMOJI_PALETTE.map((e) => (
                    <button type="button" key={e} className={`emoji-pick${v.emoji === e ? ' on' : ''}`} onClick={() => pickEmoji(e)}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {allowPrivate && (
              <div className="field">
                <label>公開範囲</label>
                <div className="seg">
                  <button
                    type="button"
                    className={v.visibility === 'shared' ? 'active' : ''}
                    onClick={() => set('visibility', 'shared')}
                  >
                    💑 2人で共有
                  </button>
                  <button
                    type="button"
                    className={v.visibility === 'private' ? 'active' : ''}
                    onClick={() => set('visibility', 'private')}
                  >
                    🔒 自分だけ
                  </button>
                </div>
              </div>
            )}

            <div className="field">
              <label>カテゴリ</label>
              <select value={v.categoryId ?? 'other'} onChange={(e) => pickCategory(e.target.value)}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>色</label>
              <div className="color-row">
                {EVENT_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`color-dot${v.color === c.value ? ' on' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => set('color', c.value)}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="field">
              <label>終日</label>
              <div className="seg">
                <button type="button" className={!v.allDay ? 'active' : ''} onClick={() => set('allDay', false)}>
                  🕒 時間を指定
                </button>
                <button type="button" className={v.allDay ? 'active' : ''} onClick={() => set('allDay', true)}>
                  📅 終日
                </button>
              </div>
            </div>

            <div className="field">
              <label>{v.allDay ? '開始日' : '開始'}</label>
              <DateTimeField value={v.start} onChange={(iso) => set('start', iso)} dateOnly={v.allDay} />
            </div>
            <div className="field">
              <label>{v.allDay ? '終了日' : '終了'}</label>
              <DateTimeField value={v.end} onChange={(iso) => set('end', iso)} dateOnly={v.allDay} />
            </div>

            <div className="field">
              <label>場所</label>
              <div className="loc-row">
                <PlaceSuggestInput
                  value={v.location}
                  onChange={(next) => set('location', next)}
                  onPlaceId={(placeId) => set('mapsPlaceId', placeId)}
                />
                <button
                  type="button"
                  className="btn sm secondary"
                  disabled={!v.location.trim()}
                  onClick={() => openInMaps(v.location)}
                >
                  🗺️ 地図
                </button>
              </div>
              <p className="muted" style={{ marginTop: 6 }}>場所を入れると、予定からGoogleマップで開けます。</p>
            </div>

            <div className="field">
              <label>メモ</label>
              <textarea value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="任意" />
            </div>
            <div className="field">
              <label>通知</label>
              <select
                value={v.reminderMinutes ?? 'none'}
                onChange={(e) => set('reminderMinutes', e.target.value === 'none' ? null : Number(e.target.value))}
              >
                <option value="none">通知しない</option>
                <option value="5">5分前</option>
                <option value="10">10分前</option>
                <option value="15">15分前</option>
                <option value="30">30分前</option>
                <option value="60">1時間前</option>
              </select>
            </div>
            {!event && (
              <div className="field">
                <label>繰り返し</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 8 }}>
                  <select
                    value={v.recurrence?.frequency ?? 'none'}
                    onChange={(e) => set('recurrence', { frequency: e.target.value as EventRecurrence['frequency'], count: v.recurrence?.count ?? 1 })}
                  >
                    <option value="none">なし</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={v.recurrence?.count ?? 1}
                    disabled={(v.recurrence?.frequency ?? 'none') === 'none'}
                    onChange={(e) => set('recurrence', { frequency: v.recurrence?.frequency ?? 'none', count: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })}
                  />
                </div>
                <p className="muted" style={{ marginTop: 6 }}>作成時に指定回数ぶん予定を作ります。</p>
              </div>
            )}
            <button className="btn" disabled={saving || !v.title.trim()} onClick={submit}>
              {saving ? '保存中…' : '保存'}
            </button>
            {error && <p className="login-error" style={{ marginTop: 10 }}>{error}</p>}
          </>
        ) : (
          <>
            <h3>
              <span style={{ marginRight: 8 }}>{v.emoji ?? '📌'}</span>
              {v.title}
            </h3>
            <p className="muted">{v.allDay ? fmtAllDayRange(v.start, v.end) : fmtDateTimeRange(v.start, v.end)}</p>
            {v.location && (
              <button type="button" className="loc-link" onClick={() => openInMaps(v.location)}>
                📍 {v.location} <span className="loc-open">Googleマップで開く ›</span>
              </button>
            )}
            {v.description && <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{v.description}</p>}
            {v.reminderMinutes != null && <p className="muted" style={{ marginTop: 8 }}>通知: {v.reminderMinutes}分前</p>}
            {!readOnly && (
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn secondary" onClick={() => setEditing(true)}>編集</button>
                {onDelete && (
                  <button className="btn danger" onClick={async () => { await onDelete(); onClose(); }}>
                    削除
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
