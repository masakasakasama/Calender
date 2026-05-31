import { useState } from 'react';
import type { CalendarEvent, EventVisibility } from '@/types';
import { fmtDateTimeRange, fromLocalInput, toLocalInput } from '@/utils/date';
import { EVENT_COLORS, DEFAULT_COLOR, EMOJI_PALETTE, suggestEmoji } from '@/utils/eventStyle';
import { openInMaps } from '@/utils/maps';

export interface EventFormValue {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  reminderMinutes: number | null;
  color: string | null;
  emoji: string | null;
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
    reminderMinutes: event?.reminderMinutes ?? initial?.reminderMinutes ?? 15,
    color: event?.color ?? initial?.color ?? DEFAULT_COLOR,
    emoji: event?.emoji ?? initial?.emoji ?? suggestEmoji(initialTitle),
    visibility: event?.visibility ?? initial?.visibility ?? 'shared',
  });
  // 絵文字をユーザーが手動変更したら、自動推定で上書きしない。
  const [emojiTouched, setEmojiTouched] = useState(Boolean(event?.emoji));
  const [showEmoji, setShowEmoji] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof EventFormValue, val: string | number | null) => setV((s) => ({ ...s, [k]: val }));

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

  const submit = async () => {
    if (!v.title.trim() || !onSave) return;
    setSaving(true);
    try {
      await onSave(v);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
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
              <label>開始</label>
              <input
                type="datetime-local"
                step={900}
                value={toLocalInput(v.start)}
                onChange={(e) => set('start', fromLocalInput(e.target.value))}
              />
            </div>
            <div className="field">
              <label>終了</label>
              <input
                type="datetime-local"
                step={900}
                value={toLocalInput(v.end)}
                onChange={(e) => set('end', fromLocalInput(e.target.value))}
              />
            </div>

            <div className="field">
              <label>場所</label>
              <div className="loc-row">
                <input value={v.location} onChange={(e) => set('location', e.target.value)} placeholder="例: 渋谷 スカイ" />
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
            <button className="btn" disabled={saving || !v.title.trim()} onClick={submit}>
              {saving ? '保存中…' : '保存'}
            </button>
          </>
        ) : (
          <>
            <h3>
              <span style={{ marginRight: 8 }}>{v.emoji ?? '📌'}</span>
              {v.title}
            </h3>
            <p className="muted">{fmtDateTimeRange(v.start, v.end)}</p>
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
