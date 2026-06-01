import { fmtYmdHm, toLocalInput, fromLocalInput } from '@/utils/date';

// 表示は yyyy/MM/dd HH:mm に統一しつつ、タップで端末のネイティブ日時ピッカーを開く。
// ネイティブ input はロケール依存の表記になるため透明にして重ね、表示は自前テキストにする。
export function DateTimeField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
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
