import { useState } from 'react';
import type { User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { usePlanIdeas } from '@/hooks/usePlanIdeas';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { suggestPlans, planToInitial, isWeekend, TIER_LABEL } from '@/utils/datePlans';
import { addDays, fmtYmd, WEEKDAY_LABELS } from '@/utils/date';
import { openInMaps } from '@/utils/maps';

// プランタブ：
//  1) やりたいことメモ（日付なしで保存・2人で共有）
//  2) 空いてる週末のおすすめ提案
export function PlanScreen({ user }: { user: User }) {
  const { events, createEvent } = useSharedEvents(user.userId);
  const { ideas, addIdea, removeIdea } = usePlanIdeas(user.userId);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

  // メモ入力
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const saveIdea = async () => {
    if (!title.trim() && !location.trim() && !desc.trim()) return;
    setSaving(true);
    try {
      await addIdea({ title, location, description: desc });
      setTitle('');
      setLocation('');
      setDesc('');
    } finally {
      setSaving(false);
    }
  };

  const occupied = (d: Date) =>
    events.some((e) => {
      const s = new Date(e.start);
      const en = new Date(new Date(e.end).getTime() - 1);
      const k = d.toDateString();
      for (let t = new Date(s.getFullYear(), s.getMonth(), s.getDate()); t <= en; t.setDate(t.getDate() + 1)) {
        if (t.toDateString() === k) return true;
      }
      return false;
    });

  const openWeekends: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && openWeekends.length < 6; i++) {
    const d = addDays(today, i);
    if (isWeekend(d) && !occupied(d)) openWeekends.push(d);
  }

  const pick = (planInitial: Partial<EventFormValue>) => {
    setAddInitial(planInitial);
    setAdding(true);
  };
  const handleSave = async (v: EventFormValue) => {
    await createEvent(v);
  };

  return (
    <div>
      {/* --- やりたいことメモ（日付なし） --- */}
      <div className="section-title">やりたいこと・行きたい場所メモ</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>やりたいこと / プラン名</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 水族館デート" />
        </div>
        <div className="field">
          <label>場所</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例: すみだ水族館" />
        </div>
        <div className="field">
          <label>メモ（やりたいこと・候補など）</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="夜は近くでディナーも◎ など" />
        </div>
        <button className="btn" disabled={saving || (!title.trim() && !location.trim() && !desc.trim())} onClick={saveIdea}>
          {saving ? '保存中…' : '＋ メモを保存'}
        </button>
      </div>

      {ideas.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="section-title">保存したプラン（{ideas.length}）</div>
          {ideas.map((it) => (
            <div className="event-card" key={it.appEventId} style={{ ['--evt-color' as string]: '#b39ddf' }}>
              <div style={{ flex: 1 }}>
                <div className="etitle">{it.emoji ? `${it.emoji} ` : ''}{it.title}</div>
                {it.location && (
                  <button type="button" className="eloc eloc-link" onClick={() => openInMaps(it.location)}>
                    📍 {it.location}
                  </button>
                )}
                {it.description && <div className="eloc" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{it.description}</div>}
              </div>
              <button className="btn sm secondary" onClick={() => removeIdea(it.appEventId)}>削除</button>
            </div>
          ))}
        </div>
      )}

      {/* --- 空いてる週末のおすすめ --- */}
      <div className="section-title">空いてる週末のおすすめ</div>
      {openWeekends.length === 0 ? (
        <div className="list-empty">この先しばらく、週末はすでに予定が入っています</div>
      ) : (
        openWeekends.map((day) => (
          <div key={day.toISOString()} style={{ marginBottom: 18 }}>
            <div className="muted" style={{ margin: '4px 4px 8px', fontWeight: 700 }}>{fmtYmd(day)}（{WEEKDAY_LABELS[day.getDay()]}）</div>
            {suggestPlans(day).map((p) => (
              <button key={p.tier} className="plan-card" onClick={() => pick(planToInitial(day, p))}>
                <span className="plan-emoji">{p.emoji}</span>
                <span className="plan-body">
                  <span className="plan-tier">{TIER_LABEL[p.tier]}</span>
                  <span className="plan-title">{p.title}</span>
                  <span className="plan-desc">{p.description}</span>
                </span>
                <span className="plan-add">＋</span>
              </button>
            ))}
          </div>
        ))
      )}

      {adding && (
        <EventModal
          initial={addInitial}
          allowPrivate={user.role === 'rebecca'}
          onClose={() => { setAdding(false); setAddInitial(undefined); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
