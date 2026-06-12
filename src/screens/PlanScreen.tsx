import { useEffect, useMemo, useRef, useState } from 'react';
import type { User, CalendarEvent } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { usePlanIdeas } from '@/hooks/usePlanIdeas';
import { useDatePlanFeedback } from '@/hooks/useDatePlanFeedback';
import { useWeekendResearch } from '@/hooks/useWeekendResearch';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { isWeekend } from '@/utils/datePlans';
import { addDays } from '@/utils/date';
import { openInMaps, openWebSearch } from '@/utils/maps';
import { fetchEventImage } from '@/utils/eventImage';
import {
  upcomingWeekendEventGroups,
  weekendEventToFeedbackItemWithResearch,
  weekendEventToInitialWithResearch,
  weekendResearchToGroups,
} from '@/utils/monthlyWeekendEvents';

export function PlanScreen({ user }: { user: User }) {
  const { createEvent } = useSharedEvents(user.userId);
  const { ideas, addIdea, updateIdea, removeIdea } = usePlanIdeas(user.userId);
  const { feedbackByItemId, setPreference } = useDatePlanFeedback(user);
  const { data: researchedWeekend } = useWeekendResearch();
  const planFormRef = useRef<HTMLDivElement | null>(null);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [weekendExpanded, setWeekendExpanded] = useState(false);
  const [todayMarker, setTodayMarker] = useState(() => new Date().toDateString());
  const weekendGroups = useMemo(() => {
    const researchedGroups = weekendResearchToGroups(researchedWeekend);
    const merged = new Map(upcomingWeekendEventGroups().map((group) => [group.key, group]));
    researchedGroups.forEach((group) => merged.set(group.key, group));
    return Array.from(merged.values()).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  }, [researchedWeekend, todayMarker]);
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
      const editingIdea = editingIdeaId ? ideas.find((idea) => idea.appEventId === editingIdeaId) : null;
      if (editingIdea) {
        await updateIdea(editingIdea, { title, location, description: desc });
      } else {
        await addIdea({ title, location, description: desc });
      }
      setTitle('');
      setLocation('');
      setDesc('');
      setEditingIdeaId(null);
    } finally {
      setSaving(false);
    }
  };

  const startEditIdea = (idea: CalendarEvent) => {
    setEditingIdeaId(idea.appEventId);
    setTitle(idea.title);
    setLocation(idea.location ?? '');
    setDesc(idea.description ?? '');
    window.setTimeout(() => {
      planFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const cancelEditIdea = () => {
    setEditingIdeaId(null);
    setTitle('');
    setLocation('');
    setDesc('');
  };

  const pick = (initial: Partial<EventFormValue>) => {
    setAddInitial(initial);
    setAdding(true);
  };

  const handleSave = async (value: EventFormValue) => {
    await createEvent(value);
  };

  return (
    <div>
      <div className="section-title">ふたりのプラン帳</div>
      <div ref={planFormRef} className="card plan-book" style={{ marginBottom: 18 }}>
        {editingIdeaId && <div className="edit-mode-note">保存済みプランを編集中</div>}
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
        <div className="plan-form-actions">
          <button className="btn" disabled={saving || (!title.trim() && !location.trim() && !desc.trim())} onClick={saveIdea}>
            {saving ? '保存中...' : editingIdeaId ? '変更を保存' : 'メモを保存'}
          </button>
          {editingIdeaId && (
            <button className="btn secondary" onClick={cancelEditIdea} disabled={saving}>
              キャンセル
            </button>
          )}
        </div>

        {ideas.length > 0 && (
          <>
            <div className="plan-book-divider">保存したプラン ({ideas.length})</div>
            {ideas.map((idea) => (
              <div
                className="event-card idea-card"
                key={idea.appEventId}
                style={{ ['--evt-color' as string]: '#b39ddf' }}
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
                </div>
                <div className="idea-actions">
                  <button className="btn sm secondary" onClick={() => startEditIdea(idea)}>
                    編集
                  </button>
                  <button className="btn sm" onClick={() => openIdeaInCalendar(idea)}>
                    予定に入れる
                  </button>
                  <button
                    className="btn sm ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeIdea(idea.appEventId);
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <section className="research-section">
        <button
          type="button"
          className="section-toggle"
          aria-expanded={weekendExpanded}
          onClick={() => setWeekendExpanded((current) => !current)}
        >
          <span>♡ 週末デート候補</span>
          <small>{weekendGroups.length > 0 ? `${weekendGroups.reduce((sum, group) => sum + group.events.length, 0)}件` : '準備中'}</small>
        </button>

        {weekendExpanded && (
          <>
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
                    <div style={{ marginTop: 12 }}>
                      {activeWeekend.events.map((item) => {
                        const feedbackItem = weekendEventToFeedbackItemWithResearch(item);
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
                                  pick(weekendEventToInitialWithResearch(item));
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
          </>
        )}
      </section>

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
