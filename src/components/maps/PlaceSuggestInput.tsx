import { useId, useState } from 'react';

function readRecentLocations(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('recent_locations') ?? '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
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
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(readRecentLocations);
  const menuId = useId();

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
  const showRecents = focused && suggestions.length > 0;

  const selectRecent = (next: string) => {
    onChange(next);
    onPlaceId?.(null);
    rememberLocation(next);
    setFocused(false);
  };

  return (
    <div className="place-suggest">
      <input
        type="text"
        name="calendar-location"
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
