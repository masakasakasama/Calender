import { useEffect, useMemo, useState } from 'react';
import type { User, CalendarEvent } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { usePlanIdeas } from '@/hooks/usePlanIdeas';
import { useDatePlanFeedback } from '@/hooks/useDatePlanFeedback';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { suggestPlans, planToInitial, isWeekend, TIER_LABEL } from '@/utils/datePlans';
import { addDays, fmtYmd, WEEKDAY_LABELS } from '@/utils/date';
import { openInMaps, openWebSearch } from '@/utils/maps';
import { fetchEventImage } from '@/utils/eventImage';
import {
  upcomingWeekendEventGroups,
  weekendEventToFeedbackItem,
  weekendEventToInitial,
} from '@/utils/monthlyWeekendEvents';

export function PlanScreen({ user }: { user: User }) {
  const { events, createEvent } = useSharedEvents(user.userId);
  const { ideas, addIdea, removeIdea } = usePlanIdeas(user.userId);
  const { feedbackByItemId, setPreference } = useDatePlanFeedback(user);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayMarker, setTodayMarker] = useState(() => new Date().toDateString());
  const weekendGroups = useMemo(() => upcomingWeekendEventGroups(), [todayMarker]);
  const [activeWeekendKey, setActiveWeekendKey] = useState(weekendGroups[0]?.key ?? '');
  const [monthlyImages, setMonthlyImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = new Date().toDateString();
      setTodayMarker((current) => (current === next ? current : next));
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!weekendGroups.some((group) => group.key === activeWeekendKey)) {
      setActiveWeekendKey(weekendGroups[0]?.key ?? '');
    }
  }, [activeWeekendKey, weekendGroups]);

  useEffect(() => {
    weekendGroups.flatMap((group) => group.events).forEach((item) => {
      if (item.imageUrl || monthlyImages[item.id] !== undefined) return;
      void fetchEventImage(item.imageQuery || item.locationName || item.title).then((url) => {
        setMonthlyImages((current) => ({ ...current, [item.id]: url }));
      });
    });
  }, [monthlyImages, weekendGroups]);

  const activeWeekend = weekendGroups.find((group) => group.key === activeWeekendKey) ?? weekendGroups[0];

  const openIdeaInCalendar = (idea: CalendarEvent) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let day = today;
    for (let i = 0; i < 7; i += 1) {
      const candidate = addDays(today, i);
      if (isWeekend(candidate)) {
        day = candidate;
        break;
      }
    }

    const start = new Date(day);
    start.setHours(11, 0, 0, 0);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    setAddInitial({
      title: idea.title,
      emoji: idea.emoji ?? undefined,
      location: idea.location,
      description: idea.description,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    setAdding(true);
  };

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

  const occupied = (day: Date) =>
    events.some((event) => {
      const start = new Date(event.start);
      const end = new Date(new Date(event.end).getTime() - 1);
      const key = day.toDateString();
      for (
        const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        cursor <= end;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        if (cursor.toDateString() === key) return true;
      }
      return false;
    });

  const openWeekends: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && openWeekends.length < 6; i += 1) {
    const day = addDays(today, i);
    if (isWeekend(day) && !occupied(day)) openWeekends.push(day);
  }

  const pick = (initial: Partial<EventFormValue>) => {
    setAddInitial(initial);
    setAdding(true);
  };

  const handleSave = async (value: EventFormValue) => {
    await createEvent(value);
  };

  return (
    <div>
      <div className="notice">
        空いている週末に、ふたりの予定候補を表示します。気に入った候補は予定に追加できます。
      </div>

      <section className="research-section">
        <div className="section-title">週末デート候補</div>
        {weekendGroups.length === 0 && <div className="list-empty">次の週末候補を準備中です</div>}
        {weekendGroups.length > 0 && (
          <>
            <div className="week-tabs" role="tablist" aria-label="週末を選択">
              {weekendGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  role="tab"
                  aria-selected={group.key === activeWeekend?.key}
                  className={`week-tab${group.key === activeWeekend?.key ? ' active' : ''}`}
                  onClick={() => setActiveWeekendKey(group.key)}
                >
                  <span>{group.tabLabel}</span>
                  <small>{group.events.length}件</small>
                </button>
              ))}
            </div>

            {activeWeekend && (
              <div className="weekend-panel">
                <div className="research-meta">{activeWeekend.label} / 東京周辺</div>
                <div className="research-summary">
                  終了した週末は自動で外れます。カードをタップすると検索、場所名を押すと地図を開きます。
                </div>
                <div style={{ marginTop: 12 }}>
                  {activeWeekend.events.map((item) => {
                    const feedbackItem = weekendEventToFeedbackItem(item);
                    const imageUrl = item.imageUrl ?? monthlyImages[item.id] ?? null;
                    return (
                      <div
                        className="ai-event-card tappable research-event-card"
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openWebSearch(`${item.title} ${item.locationName}`)}
                      >
                        <div className="ai-event-img" style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}>
                          {!imageUrl && <span className="ai-event-emoji">{item.emoji}</span>}
                          <span className="ai-event-date">
                            {item.dateLabel} / {item.area}
                          </span>
                        </div>
                        <div className="ai-event-body">
                          <div className="etitle">
                            {item.emoji} {item.title}
                          </div>
                          <button
                            type="button"
                            className="eloc eloc-link"
                            onClick={(event) => {
                              event.stopPropagation();
                              openInMaps(item.locationName);
                            }}
                          >
                            {item.locationName}
                          </button>
                          <div className="eloc" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                            {item.summary}
                          </div>
                          <div className="event-chip-row">
                            {item.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="event-chip">{tag}</span>
                            ))}
                          </div>
                          <div className="ai-event-info-hint">タップで検索</div>
                          <div className="preference-row" aria-label="好みを記録">
                            <button
                              type="button"
                              className={`pref-btn${feedbackByItemId[item.id]?.preference === 'like' ? ' active like' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void setPreference(feedbackItem, 'like');
                              }}
                            >
                              好き
                            </button>
                            <button
                              type="button"
                              className={`pref-btn${feedbackByItemId[item.id]?.preference === 'dislike' ? ' active dislike' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void setPreference(feedbackItem, 'dislike');
                              }}
                            >
                              微妙
                            </button>
                          </div>
                          <button
                            className="btn sm"
                            style={{ marginTop: 8 }}
                            onClick={(event) => {
                              event.stopPropagation();
                              pick(weekendEventToInitial(item));
                            }}
                          >
                            ＋ 予定に追加
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="section-title">ふたりのプラン帳</div>
      <div className="card plan-book" style={{ marginBottom: 18 }}>
        <p className="muted plan-book-lead">
          日付を決める前の「やりたいこと」を保存できます。保存したものをタップすると日付を入れてカレンダーに追加できます。
        </p>
        <div className="field">
          <label>やりたいこと / プラン名</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例: 水族館デート" />
        </div>
        <div className="field">
          <label>場所</label>
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例: すみだ水族館" />
        </div>
        <div className="field">
          <label>メモ</label>
          <textarea value={desc} onChange={(event) => setDesc(event.target.value)} placeholder="夜景の近くでディナーも、など" />
        </div>
        <button className="btn" disabled={saving || (!title.trim() && !location.trim() && !desc.trim())} onClick={saveIdea}>
          {saving ? '保存中...' : 'メモを保存'}
        </button>

        {ideas.length > 0 && (
          <>
            <div className="plan-book-divider">保存したプラン ({ideas.length})</div>
            {ideas.map((idea) => (
              <div
                className="event-card idea-card"
                key={idea.appEventId}
                style={{ ['--evt-color' as string]: '#b39ddf' }}
                role="button"
                tabIndex={0}
                onClick={() => openIdeaInCalendar(idea)}
              >
                <div style={{ flex: 1 }}>
                  <div className="etitle">
                    {idea.emoji ? `${idea.emoji} ` : ''}
                    {idea.title}
                  </div>
                  {idea.location && (
                    <button
                      type="button"
                      className="eloc eloc-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        openInMaps(idea.location);
                      }}
                    >
                      {idea.location}
                    </button>
                  )}
                  {idea.description && (
                    <div className="eloc" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                      {idea.description}
                    </div>
                  )}
                  <div className="idea-hint">タップして日付を入れる → カレンダーへ</div>
                </div>
                <button
                  className="btn sm secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    void removeIdea(idea.appEventId);
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="section-title">空いてる週末のおすすめ</div>
      {openWeekends.length === 0 ? (
        <div className="list-empty">この先しばらく、週末はすでに予定が入っています</div>
      ) : (
        openWeekends.map((day) => (
          <div key={day.toISOString()} style={{ marginBottom: 18 }}>
            <div className="section-title">
              {fmtYmd(day)}({WEEKDAY_LABELS[day.getDay()]})
            </div>
            {suggestPlans(day).map((plan) => (
              <button key={plan.tier} className="plan-card" onClick={() => pick(planToInitial(day, plan))}>
                <span className="plan-emoji">{plan.emoji}</span>
                <span className="plan-body">
                  <span className="plan-tier">{TIER_LABEL[plan.tier]}</span>
                  <span className="plan-title">{plan.title}</span>
                  <span className="plan-desc">{plan.description}</span>
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
          onClose={() => {
            setAdding(false);
            setAddInitial(undefined);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
