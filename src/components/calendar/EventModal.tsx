import { useState } from 'react';
import type { CalendarEvent } from '@/types';
import { fmtDateTimeRange, fromLocalInput, toLocalInput } from '@/utils/date';

export interface EventFormValue {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
}

// 予定の詳細表示 + 追加/編集/削除。
export function EventModal({
  event,
  initial,
  readOnly,
  onClose,
  onSave,
  onDelete,
}: {
  event?: CalendarEvent | null;
  initial?: Partial<EventFormValue>;
  readOnly?: boolean;
  onClose: () => void;
  onSave?: (v: EventFormValue) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}) {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const [editing, setEditing] = useState(!event && !readOnly);
  const [v, setV] = useState<EventFormValue>({
    title: event?.title ?? initial?.title ?? '',
    description: event?.description ?? initial?.description ?? '',
    location: event?.location ?? initial?.location ?? '',
    start: event?.start ?? initial?.start ?? now.toISOString(),
    end: event?.end ?? initial?.end ?? later.toISOString(),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof EventFormValue, val: string) => setV((s) => ({ ...s, [k]: val }));

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
              <input value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="例: 映画デート" autoFocus />
            </div>
            <div className="field">
              <label>開始</label>
              <input type="datetime-local" value={toLocalInput(v.start)} onChange={(e) => set('start', fromLocalInput(e.target.value))} />
            </div>
            <div className="field">
              <label>終了</label>
              <input type="datetime-local" value={toLocalInput(v.end)} onChange={(e) => set('end', fromLocalInput(e.target.value))} />
            </div>
            <div className="field">
              <label>場所</label>
              <input value={v.location} onChange={(e) => set('location', e.target.value)} placeholder="任意" />
            </div>
            <div className="field">
              <label>メモ</label>
              <textarea value={v.description} onChange={(e) => set('description', e.target.value)} placeholder="任意" />
            </div>
            <button className="btn" disabled={saving || !v.title.trim()} onClick={submit}>
              {saving ? '保存中…' : '保存'}
            </button>
          </>
        ) : (
          <>
            <h3>{v.title}</h3>
            <p className="muted">{fmtDateTimeRange(v.start, v.end)}</p>
            {v.location && <p style={{ marginTop: 8 }}>📍 {v.location}</p>}
            {v.description && <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{v.description}</p>}
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
