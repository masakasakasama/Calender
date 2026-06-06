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

/** yyyy/MM/dd 形式。 */
export function fmtYmd(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** yyyy/MM/dd HH:mm 形式。 */
export function fmtYmdHm(d: Date): string {
  return `${fmtYmd(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDateTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const head = `${fmtYmd(s)}(${WEEKDAYS[s.getDay()]}) ${fmtTime(startIso)}`;
  if (sameDay(s, e)) return `${head} – ${fmtTime(endIso)}`;
  return `${head} – ${fmtYmd(e)} ${fmtTime(endIso)}`;
}

/** yyyy/MM/dd(曜) 形式。 */
export function fmtDateWithDay(iso: string): string {
  const d = new Date(iso);
  return `${fmtYmd(d)}(${WEEKDAYS[d.getDay()]})`;
}

/** 終日予定の日付表記（1日なら「日付 終日」、複数日なら範囲）。 */
export function fmtAllDayRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (sameDay(s, e)) return `${fmtDateWithDay(startIso)} 終日`;
  return `${fmtDateWithDay(startIso)} – ${fmtDateWithDay(endIso)} 終日`;
}

/** date input 用文字列（yyyy-MM-dd・ローカル）。 */
export function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromDateInput(value: string): string {
  const [y, m, dd] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, dd ?? 1, 0, 0, 0, 0).toISOString();
}

export function startOfDayIso(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfDayIso(iso: string): string {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function fmtMonthTitle(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
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
