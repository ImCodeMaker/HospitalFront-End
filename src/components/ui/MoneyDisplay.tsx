interface MoneyDisplayProps {
  amount: number;
  className?: string;
  /** When true, negative values render in red, positive in green */
  signed?: boolean;
  /** Override the currency prefix. Defaults to "RD$" */
  prefix?: string;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MoneyDisplay({
  amount,
  className = "",
  signed = false,
  prefix = "RD$",
}: MoneyDisplayProps) {
  let colorClass = "";
  if (signed) {
    colorClass = amount < 0 ? "text-red-400" : amount > 0 ? "text-emerald-400" : "";
  }

  return (
    <span className={`font-mono tabular-nums ${colorClass} ${className}`.trim()}>
      {prefix}&nbsp;{formatMoney(amount)}
    </span>
  );
}

/** Utility exported for use outside JSX */
export function formatRD(amount: number): string {
  return `RD$ ${amount.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
