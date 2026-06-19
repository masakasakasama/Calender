import { useMemo, useRef, useEffect } from 'react';
import type { CalendarEvent } from '@/types';
import { eventDisplayColor } from '@/utils/eventStyle';
import { ymd, fmtTime } from '@/utils/date';

const HOUR_H = 56; // 1時間の高さ(px)
const DAY_MIN = 24 * 60;

interface Placed {
  ev: CalendarEvent;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

function minutesOfDay(iso: string, day: Date): number {
  const d = new Date(iso);
  // 当日0:00からの分。前日開始は0、翌日終了は1440に丸める。
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  return Math.round((d.getTime() - dayStart) / 60000);
}

// 重なりをレーン（列）に振り分ける。
function layout(events: CalendarEvent[], day: Date): Placed[] {
  const items = events
    .map((ev) => ({
      ev,
      startMin: Math.max(0, minutesOfDay(ev.start, day)),
      endMin: Math.min(DAY_MIN, Math.max(minutesOfDay(ev.end, day), minutesOfDay(ev.start, day) + 30)),
      lane: 0,
      lanes: 1,
    }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    for (const it of cluster) {
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (it.startMin >= laneEnds[i]) {
          it.lane = i;
          laneEnds[i] = it.endMin;
          placed = true;
          break;
        }
      }
      if (!placed) {
        it.lane = laneEnds.length;
        laneEnds.push(it.endMin);
      }
    }
    for (const it of cluster) {
      it.lanes = laneEnds.length;
      out.push(it);
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length && it.startMin >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
  return out;
}

export function DayTimeline({
  day,
  timed,
  onSelectEvent,
  onPickSlot,
}: {
  day: Date;
  timed: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  onPickSlot: (hour: number) => void;
}) {
  const placed = useMemo(() => layout(timed, day), [timed, day]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isToday = ymd(day) === ymd(new Date());
  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  // 初回は朝7時あたりが見えるようスクロール。今日なら現在時刻付近。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? Math.max(0, nowMin - 90) : 7 * 60;
    el.scrollTop = (target / 60) * HOUR_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd(day)]);

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="tl-scroll" ref={scrollRef}>
      <div className="tl-grid" style={{ height: 24 * HOUR_H }}>
        {/* 時間の目盛り */}
        {hours.map((h) => (
          <button
            key={h}
            type="button"
            className="tl-hour"
            style={{ top: h * HOUR_H, height: HOUR_H }}
            onClick={() => onPickSlot(h)}
            aria-label={`${h}時に予定を追加`}
          >
            <span className="tl-hour-label">{String(h).padStart(2, '0')}:00</span>
            <span className="tl-hour-line" />
          </button>
        ))}

        {/* 現在時刻ライン */}
        {nowMin >= 0 && (
          <div className="tl-now" style={{ top: (nowMin / 60) * HOUR_H }}>
            <span className="tl-now-dot" />
          </div>
        )}

        {/* 予定ブロック */}
        {placed.map((p) => {
          const top = (p.startMin / 60) * HOUR_H;
          const height = Math.max(((p.endMin - p.startMin) / 60) * HOUR_H, 26);
          const gap = 4;
          const colW = `calc((100% - 56px) / ${p.lanes})`;
          const left = `calc(56px + ${p.lane} * ${colW})`;
          const color = eventDisplayColor(p.ev);
          return (
            <button
              key={p.ev.appEventId}
              type="button"
              className="tl-event"
              style={{
                top,
                height: height - gap,
                left,
                width: `calc(${colW} - ${gap}px)`,
                ['--evt-color' as string]: color,
              }}
              onClick={() => onSelectEvent(p.ev)}
            >
              <span className="tl-event-title">
                {p.ev.emoji ? `${p.ev.emoji} ` : ''}
                {p.ev.title}
              </span>
              <span className="tl-event-time">
                {fmtTime(p.ev.start)}–{fmtTime(p.ev.end)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
