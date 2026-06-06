import { useEffect, useState } from 'react';
import type { User, CalendarEvent } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { usePlanIdeas } from '@/hooks/usePlanIdeas';
import { useWeekendResearch, researchItemToInitial } from '@/hooks/useWeekendResearch';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { suggestPlans, planToInitial, isWeekend, TIER_LABEL } from '@/utils/datePlans';
import { addDays, fmtYmd, WEEKDAY_LABELS } from '@/utils/date';
import { openInMaps, openEventSearch, openWebSearch } from '@/utils/maps';
import type { AiPlan } from '@/services/ai/AiPlanService';
import { fetchWeeklyEvents } from '@/utils/weeklyEvents';
import { fetchEventImage } from '@/utils/eventImage';

interface AiCache {
  key: string;
  plans: AiPlan[];
  images: Record<number, string | null>;
  grounded: boolean;
}

const globalCache = globalThis as typeof globalThis & { __aiPlanCache?: AiCache };
const aiCache = globalCache.__aiPlanCache ?? null;

function saveCache(cache: AiCache) {
  globalCache.__aiPlanCache = cache;
}

export function PlanScreen({ user }: { user: User }) {
  const { events, createEvent } = useSharedEvents(user.userId);
  const { ideas, addIdea, removeIdea } = usePlanIdeas(user.userId);
  const { data: research, loading: researchLoading } = useWeekendResearch();
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchArea, setSearchArea] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlans, setAiPlans] = useState<AiPlan[]>(aiCache?.plans ?? []);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiImages, setAiImages] = useState<Record<number, string | null>>(aiCache?.images ?? {});
  const [aiGrounded, setAiGrounded] = useState<boolean>(aiCache?.grounded ?? true);
  const [savedAi, setSavedAi] = useState<Record<number, boolean>>({});
  const [researchImages, setResearchImages] = useState<Record<string, string | null>>({});

  const applyResult = (plans: AiPlan[], grounded: boolean, key: string) => {
    setAiPlans(plans);
    setAiGrounded(grounded);
    const images: Record<number, string | null> = {};
    plans.forEach((plan, index) => {
      void fetchEventImage(plan.imageQuery || plan.location || plan.title).then((url) => {
        images[index] = url;
        setAiImages((current) => ({ ...current, [index]: url }));
      });
    });
    saveCache({ key, plans, images, grounded });
  };

  const runAi = async () => {
    const area = searchArea.trim();
    if (area) {
      openEventSearch(area);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiPlans([]);
    setAiImages({});
    setSavedAi({});
    try {
      const weekly = await fetchWeeklyEvents();
      if (weekly && weekly.events.length > 0) {
        applyResult(weekly.events, true, `weekly|${weekly.generatedAt}`);
      } else {
        setAiError('今週のおすすめはまだ準備中です。下の「Webで検索」も使えます。');
      }
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!aiCache && aiPlans.length === 0) void runAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!research) return;
    research.items.forEach((item) => {
      if (item.id in researchImages) return;
      void fetchEventImage(`${item.title} ${item.locationName} ${item.area}`).then((url) => {
        setResearchImages((current) => ({ ...current, [item.id]: url }));
      });
    });
  }, [research, researchImages]);

  const saveAiPlan = async (plan: AiPlan, index: number) => {
    const description = [plan.dateText && `日程: ${plan.dateText}`, plan.description].filter(Boolean).join('\n');
    await addIdea({
      title: `${plan.emoji ? `${plan.emoji} ` : ''}${plan.title}`.trim(),
      location: plan.location,
      description,
    });
    setSavedAi((current) => ({ ...current, [index]: true }));
  };

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
        空いている週末に、ふたりのデートや予定の候補を提案します。気に入ったら「＋」で予定に追加できます。
      </div>

      <div className="section-title">今週のおすすめイベント</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="loc-row" style={{ marginBottom: 6 }}>
          <input
            value={searchArea}
            onChange={(event) => setSearchArea(event.target.value)}
            placeholder="エリア指定（任意）例: 東京 / スペイン"
          />
          <button type="button" className="btn sm" onClick={runAi} disabled={aiLoading}>
            {aiLoading ? '取得中...' : '更新'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          {searchArea.trim()
            ? `「${searchArea.trim()}」をWebで検索します。`
            : '毎週更新される東京周辺の週末イベントを表示します。'}
        </p>

        {aiLoading && <p className="muted" style={{ marginTop: 10 }}>おすすめを読み込み中...</p>}

        {aiError && !aiLoading && (
          <div style={{ marginTop: 10 }}>
            <p className="muted" style={{ color: '#c46', marginBottom: 8 }}>{aiError}</p>
            <button type="button" className="btn sm secondary" onClick={() => openEventSearch(searchArea)}>
              Webで検索する
            </button>
          </div>
        )}

        {aiPlans.length > 0 && !aiGrounded && (
          <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>
            最新の開催情報は各公式サイトで確認してください。
          </p>
        )}

        {aiPlans.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {aiPlans.map((plan, index) => (
              <div
                className="ai-event-card tappable"
                key={`${plan.title}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => openWebSearch([plan.title, plan.location].filter(Boolean).join(' '))}
              >
                <div
                  className="ai-event-img"
                  style={aiImages[index] ? { backgroundImage: `url("${aiImages[index]}")` } : undefined}
                >
                  {!aiImages[index] && <span className="ai-event-emoji">{plan.emoji || '✨'}</span>}
                  {plan.dateText && <span className="ai-event-date">日程 {plan.dateText}</span>}
                </div>
                <div className="ai-event-body">
                  <div className="etitle">
                    {plan.emoji ? `${plan.emoji} ` : ''}
                    {plan.title}
                    <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                      ({TIER_LABEL[plan.tier]})
                    </span>
                  </div>
                  {plan.location && (
                    <button
                      type="button"
                      className="eloc eloc-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        openInMaps(plan.location);
                      }}
                    >
                      {plan.location}
                    </button>
                  )}
                  {plan.description && (
                    <div className="eloc" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                      {plan.description}
                    </div>
                  )}
                  <button
                    className="btn sm"
                    style={{ marginTop: 8 }}
                    disabled={savedAi[index]}
                    onClick={(event) => {
                      event.stopPropagation();
                      void saveAiPlan(plan, index);
                    }}
                  >
                    {savedAi[index] ? '保存済み' : 'メモに保存'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="research-section">
        <div className="section-title">しっかりサーチ</div>
        {researchLoading && <div className="list-empty">リサーチ結果を読み込み中...</div>}
        {!researchLoading && !research && <div className="list-empty">まだリサーチ結果がありません</div>}
        {research && (
          <>
            <div className="research-meta">
              {research.targetWeekend.label} / {research.area}
            </div>
            <div className="research-summary">{research.summary}</div>
            <div style={{ marginTop: 12 }}>
              {research.items.map((item) => (
                <div
                  className="ai-event-card tappable research-event-card"
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openWebSearch(`${item.title} ${item.locationName}`)}
                >
                  <div
                    className="ai-event-img"
                    style={researchImages[item.id] ? { backgroundImage: `url("${researchImages[item.id]}")` } : undefined}
                  >
                    {!researchImages[item.id] && <span className="ai-event-emoji">{item.emoji}</span>}
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
                    <div className="ai-event-info-hint">タップで検索</div>
                    <button
                      className="btn sm"
                      style={{ marginTop: 8 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        pick(researchItemToInitial(item));
                      }}
                    >
                      ＋ 予定に追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
