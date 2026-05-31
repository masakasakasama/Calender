// 日付ユーティリティ（依存ライブラリなしの軽量実装）。

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  // 週は月曜始まり（Mon=0 … Sun=6）。
  const diff = (d.getDay() + 6) % 7;
  r.setDate(d.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(d.getMonth() + n);
  return r;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDateTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const head = `${s.getMonth() + 1}/${s.getDate()}(${WEEKDAYS[s.getDay()]}) ${fmtTime(startIso)}`;
  if (sameDay(s, e)) return `${head} – ${fmtTime(endIso)}`;
  return `${head} – ${e.getMonth() + 1}/${e.getDate()} ${fmtTime(endIso)}`;
}

export function fmtMonthTitle(d: Date): string {
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
}

/** datetime-local input 用文字列。 */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

// getDay()(0=日)でのインデックス用。曜日名の取得に使う。
export const WEEKDAY_LABELS = WEEKDAYS;
// カレンダーの見出し行（月曜始まり）。
export const WEEKDAY_HEADERS = ['月', '火', '水', '木', '金', '土', '日'];
