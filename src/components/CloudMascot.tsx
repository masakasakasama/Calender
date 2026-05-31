// 手描き風の雲マスコット（Friendly Cloud テイスト）。
// 暗い線レイヤーの上に白を重ねて“アウトライン”を表現している。
export function CloudMascot({ size = 96 }: { size?: number }) {
  const ink = '#48526b';
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 120 98" fill="none" aria-hidden>
      {/* アウトライン（少し大きい暗い雲） */}
      <g fill={ink}>
        <circle cx="40" cy="58" r="24" />
        <circle cx="68" cy="48" r="28" />
        <circle cx="92" cy="60" r="20" />
        <rect x="36" y="56" width="58" height="30" rx="15" />
      </g>
      {/* 本体（白） */}
      <g fill="#ffffff">
        <circle cx="40" cy="58" r="20.5" />
        <circle cx="68" cy="48" r="24.5" />
        <circle cx="92" cy="60" r="16.5" />
        <rect x="38" y="58" width="54" height="25" rx="12.5" />
      </g>
      {/* 顔 */}
      <g fill={ink}>
        <circle cx="60" cy="58" r="3" />
        <circle cx="80" cy="58" r="3" />
      </g>
      <path d="M62 66 q8 7 16 0" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* ほっぺ */}
      <circle cx="54" cy="64" r="3.5" fill="#ffc4d6" opacity="0.85" />
      <circle cx="86" cy="64" r="3.5" fill="#ffc4d6" opacity="0.85" />
      {/* お花 */}
      <g>
        {[
          [60, 16],
          [69, 22],
          [65, 32],
          [55, 32],
          [51, 22],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="6" fill="#ffffff" stroke={ink} strokeWidth="2" />
        ))}
        <circle cx="60" cy="24" r="4.5" fill="#ffd66b" stroke={ink} strokeWidth="2" />
      </g>
    </svg>
  );
}
