import { useState } from 'react';
import type { User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { suggestPlans, planToInitial, isWeekend, TIER_LABEL } from '@/utils/datePlans';
import { addDays, fmtYmd, WEEKDAY_LABELS } from '@/utils/date';

// デートプラン提案画面（通知タブと入れ替え）。
// 予定が空いている週末に、3段階のプランを提案する。
export function PlanScreen({ user }: { user: User }) {
  const { events, createEvent } = useSharedEvents(user.userId);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

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

  // この先60日で、予定が無い週末を最大6件。
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
      <div className="notice">
        ☁️ 空いている週末に、ふたりのデートプランを提案します。気に入ったら「＋」で予定に追加できます。
      </div>

      {openWeekends.length === 0 ? (
        <div className="list-empty">この先しばらく、週末はすでに予定が入っています</div>
      ) : (
        openWeekends.map((day) => (
          <div key={day.toISOString()} style={{ marginBottom: 18 }}>
            <div className="section-title">{fmtYmd(day)}（{WEEKDAY_LABELS[day.getDay()]}）</div>
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
