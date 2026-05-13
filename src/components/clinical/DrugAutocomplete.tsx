import { useEffect, useState } from "react";

interface RxNormCandidate {
  rxcui: string;
  name: string;
  tty: string;
}

interface DrugAutocompleteProps {
  value: string;
  rxCui?: string;
  onChange: (name: string, rxCui?: string) => void;
  className?: string;
  placeholder?: string;
}

const RX_BASE = "https://rxnav.nlm.nih.gov/REST";

async function searchDrugs(query: string): Promise<RxNormCandidate[]> {
  if (query.trim().length < 3) return [];
  try {
    const url = `${RX_BASE}/approximateTerm.json?term=${encodeURIComponent(query)}&maxEntries=8`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const candidates: { rxcui: string; score: number }[] = json?.approximateGroup?.candidate ?? [];
    if (candidates.length === 0) return [];

    const enriched = await Promise.all(
      candidates.slice(0, 8).map(async (c) => {
        try {
          const r = await fetch(`${RX_BASE}/rxcui/${c.rxcui}/properties.json`);
          if (!r.ok) return null;
          const data = await r.json();
          const p = data?.properties;
          if (!p?.name) return null;
          return { rxcui: c.rxcui, name: p.name as string, tty: p.tty as string };
        } catch { return null; }
      })
    );
    const seen = new Set<string>();
    return enriched
      .filter((x): x is RxNormCandidate => x !== null)
      .filter((x) => { if (seen.has(x.rxcui)) return false; seen.add(x.rxcui); return true; });
  } catch {
    return [];
  }
}

export function DrugAutocomplete({ value, rxCui, onChange, className, placeholder }: DrugAutocompleteProps) {
  const [results, setResults] = useState<RxNormCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 350);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (debounced.length < 3 || rxCui) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    searchDrugs(debounced).then((r) => { if (!cancelled) { setResults(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [debounced, rxCui]);

  return (
    <div className="relative">
      <input
        type="text"
        className={className}
        value={value}
        onChange={(e) => { onChange(e.target.value, undefined); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder={placeholder ?? "Buscar medicamento…"}
      />
      {rxCui && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-mint-200 text-mint-700 rounded-full px-1.5 py-0.5">
          RxCUI {rxCui}
        </span>
      )}
      {showResults && (loading || results.length > 0) && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-surface-100 border border-surface-700/40 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-ink/50">Buscando en RxNorm…</div>}
          {results.map((r) => (
            <button
              key={r.rxcui}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(r.name, r.rxcui); setShowResults(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-200 flex items-center justify-between border-b border-surface-700/20 last:border-0"
            >
              <span className="text-ink truncate">{r.name}</span>
              <span className="text-[10px] font-mono text-ink/40 ml-2">{r.rxcui}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
