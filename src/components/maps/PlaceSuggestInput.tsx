import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: Record<string, unknown>,
          ) => { addListener: (name: string, cb: () => void) => void; getPlace: () => { formatted_address?: string; name?: string; place_id?: string } };
        };
      };
    };
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (!mapsScriptPromise) {
    mapsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=ja&region=JP`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Googleマップ候補を読み込めませんでした'));
      document.head.appendChild(script);
    });
  }
  return mapsScriptPromise;
}

export function PlaceSuggestInput({
  value,
  onChange,
  onPlaceId,
}: {
  value: string;
  onChange: (value: string) => void;
  onPlaceId?: (placeId: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);
  const listId = 'recent-locations';
  const recent = (() => {
    try {
      return JSON.parse(localStorage.getItem('recent_locations') ?? '[]') as string[];
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    let alive = true;
    loadMaps()
      .then(() => {
        if (!alive || !inputRef.current || !window.google?.maps?.places) return;
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name', 'place_id'],
        });
        ac.addListener('place_changed', () => {
          const p = ac.getPlace();
          onChange(p.formatted_address || p.name || inputRef.current?.value || '');
          onPlaceId?.(p.place_id ?? null);
        });
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      alive = false;
    };
  }, [onChange, onPlaceId]);

  const remember = (next: string) => {
    onChange(next);
    onPlaceId?.(null);
    const trimmed = next.trim();
    if (!trimmed) return;
    const merged = [trimmed, ...recent.filter((x) => x !== trimmed)].slice(0, 8);
    localStorage.setItem('recent_locations', JSON.stringify(merged));
  };

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        list={ready ? undefined : listId}
        onChange={(e) => remember(e.target.value)}
        placeholder="例: 渋谷 スカイ"
      />
      {!ready && (
        <datalist id={listId}>
          {recent.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      )}
    </>
  );
}
