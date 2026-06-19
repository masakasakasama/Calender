import { useRef } from 'react';

// 横スワイプ検出。左右で前後の日へ移動する用途。
// 縦移動が大きいときは無視（スクロールを邪魔しない）。
export function useSwipe(
  { onLeft, onRight }: { onLeft?: () => void; onRight?: () => void },
  threshold = 60,
) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!start.current) return;
    const dx = e.changedTouches[0].clientX - start.current.x;
    const dy = e.changedTouches[0].clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onLeft?.();
    else onRight?.();
  };

  return { onTouchStart, onTouchEnd };
}
