import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function Card({ children, className = "", delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      className={`bg-white rounded-2xl border border-surface-700/40 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_12px_rgba(15,15,15,0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ icon, title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
      <div className="flex items-center gap-2 min-w-0">
        {icon && (
          <span className="w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center text-ink/60">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink truncate">{title}</h3>
          {subtitle && <p className="text-xs text-ink/50 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardAction({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-ink/60 hover:text-ink hover:bg-surface-200 transition-colors border border-surface-700/40">
      {children}
    </button>
  );
}

export function StatusPill({ children, variant }: { children: React.ReactNode; variant: "success" | "open" | "warning" | "danger" | "info" | "neutral" }) {
  const cls = {
    success: "bg-mint-200 text-mint-700",
    open: "bg-amber-100 text-amber-700",
    warning: "bg-amber-200 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-lavender-200 text-lavender-700",
    neutral: "bg-surface-200 text-ink/60",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${{
        success: "bg-mint-500",
        open: "bg-amber-500",
        warning: "bg-amber-500",
        danger: "bg-rose-500",
        info: "bg-lavender-500",
        neutral: "bg-ink/40",
      }[variant]}`} />
      {children}
    </span>
  );
}
