import { useRef } from 'react';

// ボトムシートを下スワイプで閉じる。シートが一番上までスクロールされている
// ときだけ反応する（中身のスクロールを邪魔しない）。
export function useSwipeDownClose(onClose: () => void, threshold = 70) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const el = ref.current;
    startY.current = el && el.scrollTop <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    if (dy > threshold) onClose();
  };

  return { ref, onTouchStart, onTouchEnd };
}
