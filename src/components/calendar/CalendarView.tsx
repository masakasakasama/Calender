import { useEffect, useRef, useState } from 'react';
import type { CalendarEvent } from '@/types';
import { EventCard } from './EventCard';
import type { EventFormValue } from './EventModal';
import { useSwipeDownClose } from '@/hooks/useSwipeDownClose';
import { eventDisplayColor } from '@/utils/eventStyle';
import { suggestPlans, planToInitial, isWeekend, TIER_LABEL } from '@/utils/datePlans';
import {
  addDays,
  addMonths,
  fmtMonthTitle,
  sameDay,
  startOfWeek,
  WEEKDAY_LABELS,
  WEEKDAY_HEADERS,
  ymd,
} from '@/utils/date';

type Mode = 'month' | 'week' | 'day';

// 月/週/日表示を切り替えられる共有カレンダービュー。
export function CalendarView({
  events,
  onSelectEvent,
  onAddOnDate,
  requestDay,
  onRequestHandled,
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  onAddOnDate?: (date: Date, initial?: Partial<EventFormValue>) => void;
  requestDay?: Date | null;
  onRequestHandled?: () => void;
}) {
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [slide, setSlide] = useState<'l' | 'r' | null>(null);
  const [sheetDate, setSheetDate] = useState<Date | null>(null);

  // 外部から指定された日（週末バナー等）のシートを開く。
  useEffect(() => {
    if (requestDay) {
      setCursor(requestDay);
      setSheetDate(requestDay);
      onRequestHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestDay]);

  // その日に「かかっている」予定を返す（複数日にまたがる予定は全ての日に表示）。
  const eventsOn = (d: Date) => {
    const key = ymd(d);
    return events
      .filter((e) => {
        const startKey = ymd(new Date(e.start));
        // 終了が翌0:00ちょうどの場合は前日までとみなす（終日/区切り対策）。
        const endKey = ymd(new Date(new Date(e.end).getTime() - 1));
        const lastKey = endKey >= startKey ? endKey : startKey;
        return startKey <= key && key <= lastKey;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  };

  const move = (dir: number) => {
    setSlide(dir > 0 ? 'l' : 'r');
    if (mode === 'month') setCursor(addMonths(cursor, dir));
    else if (mode === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
  };

  // 左右スワイプで前後の月/週/日へ移動。
  const touch = { x: 0, y: 0 };
  const onTouchStart = (e: React.TouchEvent) => {
    touch.x = e.touches[0].clientX;
    touch.y = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      move(dx < 0 ? 1 : -1); // 左スワイプ=次、右スワイプ=前
    }
  };

  const title =
    mode === 'month'
      ? fmtMonthTitle(cursor)
      : mode === 'week'
        ? `${ymd(startOfWeek(cursor))} の週`
        : `${cursor.getMonth() + 1}/${cursor.getDate()}(${WEEKDAY_LABELS[cursor.getDay()]})`;

  return (
    <div>
      <div className="cal-toolbar">
        <button className="navbtn" onClick={() => move(-1)}>‹</button>
        <div className="title">{title}</div>
        <button className="navbtn" onClick={() => move(1)}>›</button>
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {(['month', 'week', 'day'] as Mode[]).map((m) => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            {m === 'month' ? '月' : m === 'week' ? '週' : '日'}
          </button>
        ))}
      </div>

      <div
        className={`cal-swipe${slide ? ` slide-${slide}` : ''}`}
        key={`${mode}-${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onAnimationEnd={() => setSlide(null)}
      >
        {mode === 'month' && <MonthView cursor={cursor} events={events} onPickDay={(d) => setSheetDate(d)} />}
        {mode === 'week' && <ContinuousWeekView cursor={cursor} eventsOn={eventsOn} onSelectEvent={onSelectEvent} />}
        {mode === 'day' && <ContinuousDayView cursor={cursor} eventsOn={eventsOn} onSelectEvent={onSelectEvent} />}
      </div>

      {sheetDate && (
        <DaySheet
          day={sheetDate}
          events={eventsOn(sheetDate)}
          onClose={() => setSheetDate(null)}
          onSelectEvent={(e) => { setSheetDate(null); onSelectEvent(e); }}
          onAdd={onAddOnDate ? (init) => { const d = sheetDate; setSheetDate(null); onAddOnDate(d, init); } : undefined}
        />
      )}
    </div>
  );
}

// 月表示で日付をタップしたときに開く、その日の予定シート。
function DaySheet({
  day,
  events,
  onClose,
  onSelectEvent,
  onAdd,
}: {
  day: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (e: CalendarEvent) => void;
  onAdd?: (initial?: Partial<EventFormValue>) => void;
}) {
  const swipe = useSwipeDownClose(onClose);
  // 予定がない土日は、おすすめプランを提案する。
  const showPlans = events.length === 0 && isWeekend(day);
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
        <h3>{day.getFullYear()}年{day.getMonth() + 1}月{day.getDate()}日({WEEKDAY_LABELS[day.getDay()]})</h3>
        {events.length === 0 ? (
          <div className="empty" style={{ padding: showPlans ? '12px' : undefined }}>この日の予定はありません</div>
        ) : (
          events.map((e) => <EventCard key={e.appEventId} event={e} onClick={() => onSelectEvent(e)} />)
        )}

        {showPlans && onAdd && (
          <div className="plan-suggest">
            <div className="plan-head">☁️ 空いてる週末♪ おすすめプラン</div>
            {suggestPlans(day).map((p) => (
              <button key={p.tier} className="plan-card" onClick={() => onAdd(planToInitial(day, p))}>
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
        )}

        {onAdd && (
          <button className="btn" style={{ marginTop: 10 }} onClick={() => onAdd()}>＋ この日に予定を追加</button>
        )}
      </div>
    </div>
  );
}

const MAX_LANES = 3;

// 月表示：複数日にまたがる予定を連続したバーで表示（週ごとにレイアウト）。
function MonthView({
  cursor,
  events,
  onPickDay,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const today = new Date();

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

  const weeks = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)),
  );

  return (
    <div className="month">
      <div className="dow-row">
        {WEEKDAY_HEADERS.map((w) => (
          <div className="dow" key={w}>{w}</div>
        ))}
      </div>
      {weeks.map((week, wi) => {
        const ws = week[0];
        const we = week[6];

        // この週にかかる予定を「セグメント」に変換。
        type Seg = { e: CalendarEvent; c0: number; c1: number; contLeft: boolean; contRight: boolean; lane: number };
        const raw: Omit<Seg, 'lane'>[] = [];
        for (const e of events) {
          const s = startOfDay(new Date(e.start));
          let en = startOfDay(new Date(new Date(e.end).getTime() - 1));
          if (en < s) en = s;
          if (en < ws || s > we) continue;
          raw.push({
            e,
            c0: Math.max(0, dayDiff(s, ws)),
            c1: Math.min(6, dayDiff(en, ws)),
            contLeft: s < ws,
            contRight: en > we,
          });
        }
        // レーン割り当て（重ならないように積む）。
        raw.sort((a, b) => a.c0 - b.c0 || b.c1 - b.c0 - (a.c1 - a.c0));
        const laneEnds: number[] = [];
        const placed: Seg[] = [];
        const overflow: Record<number, number> = {};
        for (const seg of raw) {
          let lane = 0;
          while (lane < MAX_LANES && laneEnds[lane] != null && seg.c0 <= laneEnds[lane]) lane++;
          if (lane < MAX_LANES) {
            laneEnds[lane] = seg.c1;
            placed.push({ ...seg, lane });
          } else {
            for (let c = seg.c0; c <= seg.c1; c++) overflow[c] = (overflow[c] ?? 0) + 1;
          }
        }

        return (
          <div className="wk" key={wi}>
            <div className="wk-grid">
              {week.map((d, i) => {
                const dim = d.getMonth() !== cursor.getMonth();
                return (
                  <div
                    key={`c${i}`}
                    className={`wk-cell${dim ? ' dim' : ''}${sameDay(d, today) ? ' today' : ''}`}
                    style={{ gridColumn: i + 1, gridRow: '1 / -1' }}
                    onClick={() => onPickDay(d)}
                  />
                );
              })}
              {week.map((d, i) => (
                <div
                  key={`n${i}`}
                  className={`wk-dnum${d.getMonth() !== cursor.getMonth() ? ' dim' : ''}`}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                >
                  {d.getDate()}
                </div>
              ))}
              {placed.map((seg, idx) => (
                <div
                  key={`b${idx}`}
                  className={`evt-bar${seg.contLeft ? ' cl' : ''}${seg.contRight ? ' cr' : ''}`}
                  style={{ gridColumn: `${seg.c0 + 1} / ${seg.c1 + 2}`, gridRow: seg.lane + 2, background: eventDisplayColor(seg.e) }}
                >
                  {seg.e.emoji ? `${seg.e.emoji} ` : ''}
                  {seg.e.title}
                </div>
              ))}
              {Object.entries(overflow).map(([c, n]) => (
                <div key={`o${c}`} className="evt-more" style={{ gridColumn: Number(c) + 1, gridRow: MAX_LANES + 2 }}>
                  +{n}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContinuousWeekView({
  cursor,
  eventsOn,
  onSelectEvent,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const currentStart = startOfWeek(cursor);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const weekStarts = Array.from({ length: 33 }, (_, i) => addDays(currentStart, (i - 8) * 7));

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'start' });
  }, [ymd(currentStart)]);

  return (
    <div className="day-list continuous-list">
      {weekStarts.map((weekStart) => {
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const isCurrent = ymd(weekStart) === ymd(currentStart);
        return (
          <div key={ymd(weekStart)} ref={isCurrent ? currentRef : undefined} className="week-block">
            <div className="week-separator">{ymd(weekStart)} の週</div>
            {days.map((d) => {
              const evs = eventsOn(d);
              return (
                <div key={d.toISOString()} className="day-block">
                  <h4>{d.getMonth() + 1}/{d.getDate()}({WEEKDAY_LABELS[d.getDay()]})</h4>
                  {evs.length === 0 ? (
                    <div className="muted" style={{ padding: '4px 4px 8px' }}>予定なし</div>
                  ) : (
                    evs.map((e) => <EventCard key={e.appEventId} event={e} onClick={() => onSelectEvent(e)} />)
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ContinuousDayView({
  cursor,
  eventsOn,
  onSelectEvent,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const currentRef = useRef<HTMLDivElement | null>(null);
  const days = Array.from({ length: 91 }, (_, i) => addDays(cursor, i - 21));

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'start' });
  }, [ymd(cursor)]);

  return (
    <div className="day-list continuous-list">
      {days.map((day) => {
        const events = eventsOn(day);
        const isCurrent = sameDay(day, cursor);
        return (
          <div key={ymd(day)} ref={isCurrent ? currentRef : undefined} className={`day-block${isCurrent ? ' current' : ''}`}>
            <h4>{day.getMonth() + 1}/{day.getDate()}({WEEKDAY_LABELS[day.getDay()]})</h4>
            {events.length === 0 ? (
              <div className="muted" style={{ padding: '4px 4px 8px' }}>予定なし</div>
            ) : (
              events.map((e) => <EventCard key={e.appEventId} event={e} onClick={() => onSelectEvent(e)} />)
            )}
          </div>
        );
      })}
    </div>
  );
}
