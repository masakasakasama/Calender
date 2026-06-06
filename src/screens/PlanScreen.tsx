import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { usePlanIdeas } from '@/hooks/usePlanIdeas';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { suggestPlans, planToInitial, isWeekend, TIER_LABEL } from '@/utils/datePlans';
import { addDays, fmtYmd, WEEKDAY_LABELS } from '@/utils/date';
import { openInMaps, openEventSearch } from '@/utils/maps';
import { fetchAiPlans, type AiPlan } from '@/services/ai/AiPlanService';
import { fetchWeeklyEvents } from '@/utils/weeklyEvents';
import { fetchEventImage } from '@/utils/eventImage';

// AIおすすめのキャッシュ（タブ切替のたびに呼び直して無料枠を消費しないため、
// アプリ起動中はメモリに保持する）。手動「更新」または日付/エリア変更でのみ再取得。
const aiCache: {
  key: string;
  plans: AiPlan[];
  images: Record<number, string | null>;
  grounded: boolean;
} | null = (globalThis as { __aiPlanCache?: typeof aiCache }).__aiPlanCache ?? null;

function saveCache(c: NonNullable<typeof aiCache>) {
  (globalThis as { __aiPlanCache?: typeof aiCache }).__aiPlanCache = c;
}

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
  const [searchArea, setSearchArea] = useState('');

  // AIおすすめ（今週のイベント）。初回のみ自動取得し、結果はキャッシュ。
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlans, setAiPlans] = useState<AiPlan[]>(aiCache?.plans ?? []);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiImages, setAiImages] = useState<Record<number, string | null>>(aiCache?.images ?? {});
  const [aiGrounded, setAiGrounded] = useState<boolean>(aiCache?.grounded ?? true);
  const [savedAi, setSavedAi] = useState<Record<number, boolean>>({});

  const applyResult = (plans: AiPlan[], grounded: boolean, key: string) => {
    setAiPlans(plans);
    setAiGrounded(grounded);
    const images: Record<number, string | null> = {};
    plans.forEach((p, i) => {
      void fetchEventImage(p.imageQuery || p.location || p.title).then((url) => {
        images[i] = url;
        setAiImages((m) => ({ ...m, [i]: url }));
      });
    });
    saveCache({ key, plans, images, grounded });
  };

  const runAi = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiPlans([]);
    setAiImages({});
    setSavedAi({});
    try {
      const today = fmtYmd(new Date());
      const area = searchArea.trim();

      // エリア未指定（既定の今週おすすめ）は、定期生成済みの weekly-events.json を優先。
      // 鍵不要・無料・常に表示できる。エリアを指定したときだけライブAIを使う。
      if (!area) {
        const weekly = await fetchWeeklyEvents();
        if (weekly && weekly.events.length > 0) {
          applyResult(weekly.events, true, `weekly|${weekly.generatedAt}`);
          return;
        }
      }

      // フォールバック / エリア指定時：ライブAI（無料枠の範囲で）。
      const res = await fetchAiPlans({ area, date: today });
      if (res.ok) {
        applyResult(res.plans, res.grounded ?? true, `${area}|${today}`);
      } else {
        setAiError(res.error ?? 'うまく取得できませんでした。');
      }
    } finally {
      setAiLoading(false);
    }
  };

  // 初回マウント時のみ、キャッシュが無ければ自動取得。
  useEffect(() => {
    if (!aiCache && aiPlans.length === 0) void runAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAiPlan = async (p: AiPlan, idx: number) => {
    const desc = [p.dateText && `🗓 ${p.dateText}`, p.description].filter(Boolean).join('\n');
    await addIdea({
      title: `${p.emoji ? `${p.emoji} ` : ''}${p.title}`.trim(),
      location: p.location,
      description: desc,
    });
    setSavedAi((s) => ({ ...s, [idx]: true }));
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
      {/* --- 今週のおすすめイベント（AIが自動取得・画像付き） --- */}
      <div className="section-title">✨ 今週のおすすめイベント</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="loc-row" style={{ marginBottom: 6 }}>
          <input
            value={searchArea}
            onChange={(e) => setSearchArea(e.target.value)}
            placeholder="エリア指定（任意）例: 京都 / スペイン"
          />
          <button type="button" className="btn sm" onClick={runAi} disabled={aiLoading}>
            {aiLoading ? '取得中…' : '🔄 更新'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          {searchArea.trim()
            ? `「${searchArea.trim()}」をAIがWebで調べて提案します（🔄更新を押してね）。`
            : '毎週自動更新。東京周辺の今週のイベント・お祭りを表示します。エリアを入れて🔄更新すると、その地域をAIが調べます。'}
        </p>

        {aiLoading && (
          <p className="muted" style={{ marginTop: 10 }}>
            AIがWebを調べています…（10〜20秒ほどかかることがあります）
          </p>
        )}

        {aiError && !aiLoading && (
          <div style={{ marginTop: 10 }}>
            <p className="muted" style={{ color: '#c46', marginBottom: 8 }}>{aiError}</p>
            <button type="button" className="btn sm secondary" onClick={() => openEventSearch(searchArea)}>
              🔍 かわりにWebで検索する
            </button>
          </div>
        )}

        {aiPlans.length > 0 && !aiGrounded && (
          <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>
            ※ いまWeb検索が制限中のため、AIの知識ベースのおすすめです（最新の開催情報は各自で確認してね）。
          </p>
        )}

        {aiPlans.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {aiPlans.map((p, idx) => (
              <div className="ai-event-card" key={idx}>
                <div
                  className="ai-event-img"
                  style={
                    aiImages[idx]
                      ? { backgroundImage: `url("${aiImages[idx]}")` }
                      : undefined
                  }
                >
                  {!aiImages[idx] && <span className="ai-event-emoji">{p.emoji || '✨'}</span>}
                  {p.dateText && <span className="ai-event-date">🗓 {p.dateText}</span>}
                </div>
                <div className="ai-event-body">
                  <div className="etitle">
                    {p.emoji ? `${p.emoji} ` : ''}
                    {p.title}
                    <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                      （{TIER_LABEL[p.tier]}）
                    </span>
                  </div>
                  {p.location && (
                    <button type="button" className="eloc eloc-link" onClick={() => openInMaps(p.location)}>
                      📍 {p.location}
                    </button>
                  )}
                  {p.description && (
                    <div className="eloc" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{p.description}</div>
                  )}
                  <button
                    className="btn sm"
                    style={{ marginTop: 8 }}
                    disabled={savedAi[idx]}
                    onClick={() => saveAiPlan(p, idx)}
                  >
                    {savedAi[idx] ? '保存済み' : '＋ メモに保存'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
