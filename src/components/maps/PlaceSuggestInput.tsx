import { useEffect, useId, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: Record<string, unknown>,
          ) => {
            addListener: (name: string, cb: () => void) => { remove?: () => void };
            getPlace: () => { formatted_address?: string; name?: string; place_id?: string };
          };
        };
      };
    };
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function readRecentLocations(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('recent_locations') ?? '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

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
  const onChangeRef = useRef(onChange);
  const onPlaceIdRef = useRef(onPlaceId);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(readRecentLocations);
  const menuId = useId();

  onChangeRef.current = onChange;
  onPlaceIdRef.current = onPlaceId;

  useEffect(() => {
    let alive = true;
    let removeListener: (() => void) | undefined;
    loadMaps()
      .then(() => {
        if (!alive || !inputRef.current || !window.google?.maps?.places) return;
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name', 'place_id'],
        });
        const listener = ac.addListener('place_changed', () => {
          const p = ac.getPlace();
          const next = p.formatted_address || p.name || inputRef.current?.value || '';
          onChangeRef.current(next);
          onPlaceIdRef.current?.(p.place_id ?? null);
          rememberLocation(next);
        });
        removeListener = () => listener.remove?.();
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      alive = false;
      removeListener?.();
    };
  }, []);

  const rememberLocation = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed) return;
    setRecent((current) => {
      const merged = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, 8);
      try {
        localStorage.setItem('recent_locations', JSON.stringify(merged));
      } catch {
        // Location entry must keep working when storage is unavailable.
      }
      return merged;
    });
  };

  const normalizedValue = value.trim().toLocaleLowerCase('ja-JP');
  const suggestions = recent
    .filter((item) => item !== value.trim())
    .filter((item) => !normalizedValue || item.toLocaleLowerCase('ja-JP').includes(normalizedValue))
    .slice(0, 5);
  const showRecents = !ready && focused && suggestions.length > 0;

  const selectRecent = (next: string) => {
    onChange(next);
    onPlaceId?.(null);
    rememberLocation(next);
    setFocused(false);
  };

  return (
    <div className="place-suggest">
      <input
        ref={inputRef}
        type="text"
        value={value}
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-controls={showRecents ? menuId : undefined}
        aria-expanded={showRecents}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          rememberLocation(value);
          setFocused(false);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          onPlaceId?.(null);
        }}
        placeholder="例: 渋谷 スカイ"
      />
      {showRecents && (
        <div id={menuId} className="place-suggest-menu" role="listbox" aria-label="最近入力した場所">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="place-suggest-option"
              role="option"
              aria-selected={false}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => selectRecent(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
