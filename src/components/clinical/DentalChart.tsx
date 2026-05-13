import { useMemo } from "react";

export type ToothStatus = "healthy" | "caries" | "filled" | "missing" | "crown" | "extracted";

export type DentalChartState = Record<string, ToothStatus>;

const STATUS_CYCLE: ToothStatus[] = ["healthy", "caries", "filled", "crown", "extracted", "missing"];

const STATUS_COLOR: Record<ToothStatus, string> = {
  healthy: "#ffffff",
  caries: "#f87171",
  filled: "#60a5fa",
  crown: "#facc15",
  extracted: "#9ca3af",
  missing: "#1f2937",
};

const STATUS_LABEL: Record<ToothStatus, string> = {
  healthy: "Sano",
  caries: "Caries",
  filled: "Obturado",
  crown: "Corona",
  extracted: "Extraído",
  missing: "Ausente",
};

// FDI tooth numbering: upper-right (11-18), upper-left (21-28), lower-left (31-38), lower-right (41-48)
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

interface ToothProps {
  number: number;
  status: ToothStatus;
  onClick: () => void;
  flipped?: boolean;
}

function Tooth({ number, status, onClick, flipped }: ToothProps) {
  const fill = STATUS_COLOR[status];
  const strokeColor = status === "missing" ? "#374151" : "#374151";
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${number} — ${STATUS_LABEL[status]}`}
      className="group flex flex-col items-center gap-1 px-1 py-0.5 rounded-md hover:bg-surface-200 transition-colors"
    >
      <span className="text-[10px] text-ink/50 group-hover:text-ink font-mono">{number}</span>
      <svg
        width="28"
        height="32"
        viewBox="0 0 28 32"
        className={`transition-transform group-hover:scale-110 ${flipped ? "rotate-180" : ""}`}
      >
        <path
          d="M14 2 C 22 2 25 8 25 14 C 25 22 19 30 14 30 C 9 30 3 22 3 14 C 3 8 6 2 14 2 Z"
          fill={fill}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {status === "extracted" && (
          <line x1="4" y1="4" x2="24" y2="28" stroke="#b91c1c" strokeWidth="2" />
        )}
        {status === "crown" && (
          <path d="M7 8 L11 4 L14 8 L17 4 L21 8 L21 12 L7 12 Z" fill="#eab308" stroke={strokeColor} strokeWidth="1" />
        )}
      </svg>
    </button>
  );
}

interface DentalChartProps {
  value: DentalChartState;
  onChange: (next: DentalChartState) => void;
  readOnly?: boolean;
}

export function DentalChart({ value, onChange, readOnly }: DentalChartProps) {
  const cycle = (num: number) => {
    if (readOnly) return;
    const current = value[String(num)] ?? "healthy";
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    const updated = { ...value, [String(num)]: next };
    if (next === "healthy") delete updated[String(num)];
    onChange(updated);
  };

  const get = (n: number): ToothStatus => value[String(n)] ?? "healthy";

  const summary = useMemo(() => {
    const all = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT];
    const counts: Record<ToothStatus, number> = { healthy: 0, caries: 0, filled: 0, crown: 0, extracted: 0, missing: 0 };
    all.forEach((n) => counts[get(n)]++);
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface-100 border border-surface-700/40 rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide text-center">Maxilar superior</p>
        <div className="grid grid-cols-2">
          <div className="flex justify-end gap-0.5 border-r-2 border-dashed border-ink/20 pr-2">
            {UPPER_RIGHT.map((n) => <Tooth key={n} number={n} status={get(n)} onClick={() => cycle(n)} />)}
          </div>
          <div className="flex gap-0.5 pl-2">
            {UPPER_LEFT.map((n) => <Tooth key={n} number={n} status={get(n)} onClick={() => cycle(n)} />)}
          </div>
        </div>
        <div className="border-t border-dashed border-ink/20 my-1" />
        <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide text-center">Maxilar inferior</p>
        <div className="grid grid-cols-2">
          <div className="flex justify-end gap-0.5 border-r-2 border-dashed border-ink/20 pr-2">
            {LOWER_RIGHT.map((n) => <Tooth key={n} number={n} status={get(n)} onClick={() => cycle(n)} flipped />)}
          </div>
          <div className="flex gap-0.5 pl-2">
            {LOWER_LEFT.map((n) => <Tooth key={n} number={n} status={get(n)} onClick={() => cycle(n)} flipped />)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3 text-xs">
          {(Object.keys(STATUS_LABEL) as ToothStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-ink/20" style={{ background: STATUS_COLOR[s] }} />
              <span className="text-ink/70">{STATUS_LABEL[s]}</span>
              <span className="text-ink/40 font-mono">{summary[s]}</span>
            </div>
          ))}
        </div>
        {!readOnly && <p className="text-xs text-ink/50">Click en cada diente para cambiar estado.</p>}
      </div>
    </div>
  );
}
