import { fmtYmdHm, fmtYmd, toLocalInput, fromLocalInput, toDateInput, fromDateInput } from '@/utils/date';

// 表示は yyyy/MM/dd HH:mm に統一しつつ、タップで端末のネイティブ日時ピッカーを開く。
// ネイティブ input はロケール依存の表記になるため透明にして重ね、表示は自前テキストにする。
// dateOnly=true のときは時刻なしの日付ピッカー（終日予定用）。
export function DateTimeField({
  value,
  onChange,
  dateOnly,
}: {
  value: string;
  onChange: (iso: string) => void;
  dateOnly?: boolean;
}) {
  if (dateOnly) {
    return (
      <div className="dt-field">
        <span className="dt-text">{fmtYmd(new Date(value))}</span>
        <input
          type="date"
          value={toDateInput(value)}
          onChange={(e) => {
            if (e.target.value) onChange(fromDateInput(e.target.value));
          }}
          aria-label="日付を選択"
        />
      </div>
    );
  }
  return (
    <div className="dt-field">
      <span className="dt-text">{fmtYmdHm(new Date(value))}</span>
      <input
        type="datetime-local"
        step={900}
        value={toLocalInput(value)}
        onChange={(e) => {
          if (e.target.value) onChange(fromLocalInput(e.target.value));
        }}
        aria-label="日時を選択"
      />
    </div>
  );
}
