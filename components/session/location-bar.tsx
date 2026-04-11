"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

type CityResult = {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    road?: string;
    house_number?: string;
  };
};

const RADIUS_OPTIONS = [10, 25, 50, 100];

export function LocationBar({
  city,
  radius,
  onLocationChange,
  onRadiusChange,
  loading,
}: {
  city: string;
  radius: number;
  onLocationChange: (city: string, lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState(city);
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(city);
  }, [city]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=de&format=json&addressdetails=1&limit=5`,
          { headers: { "Accept-Language": "de" } }
        );
        const data: CityResult[] = await res.json();
        setResults(data.slice(0, 5));
        setShowDropdown(true);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function getLabel(result: CityResult): { primary: string; secondary?: string } {
    const a = result.address;
    const city = a.city ?? a.town ?? a.village ?? a.suburb ?? "";

    if (a.road) {
      const street = a.house_number ? `${a.road} ${a.house_number}` : a.road;
      return { primary: street, secondary: [a.postcode, city].filter(Boolean).join(" ") };
    }
    if (a.postcode && !city) {
      return { primary: a.postcode, secondary: a.state };
    }
    if (a.postcode && city) {
      return { primary: `${a.postcode} ${city}`, secondary: a.state };
    }
    return { primary: city || result.name, secondary: a.state };
  }

  function pickCity(result: CityResult) {
    const { primary, secondary } = getLabel(result);
    const name = secondary ? `${primary}, ${secondary}` : primary;
    setQuery(primary);
    setShowDropdown(false);
    setResults([]);
    onLocationChange(name, parseFloat(result.lat), parseFloat(result.lon));
  }

  return (
    <div className="flex items-center gap-2">
      {/* City search */}
      <div className="relative flex-1">
        <div
          className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-3 py-2.5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          {searching || loading ? (
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Stadt suchen..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {results.map((r, i) => {
              const { primary, secondary } = getLabel(r);
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  onClick={() => pickCity(r)}
                >
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="font-medium">{primary}</span>
                  {secondary && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {secondary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Radius selector */}
      <div
        className="flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-2.5 text-sm"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <select
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="bg-transparent text-sm outline-none cursor-pointer"
        >
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r} km
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
