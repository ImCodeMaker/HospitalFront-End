import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { toggleFullscreen } from "@/lib/window";
import { TwoFactorWizard, TwoFactorDisableModal } from "@/components/auth/TwoFactorWizard";
import { useSystemAlerts } from "@/hooks/useSystemAlerts";
import { setLanguage } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import type { UserRole } from "@/store/authStore";

interface NavItem {
  to: string;
  labelKey: string;
  tourId?: string;
  roles: UserRole[];
  icon: React.ReactNode;
}

function ic(d: string) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d={d} />
    </svg>
  );
}

const PRIMARY: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", tourId: "nav-dashboard", roles: ["Admin", "Doctor", "Receptionist", "Nurse", "LabTechnician"],
    icon: ic("M3 11l9-8 9 8M5 9.5V21h14V9.5") },
  { to: "/patients", labelKey: "nav.patients", tourId: "nav-patients", roles: ["Admin", "Doctor", "Receptionist", "Nurse"],
    icon: ic("M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75") },
  { to: "/appointments", labelKey: "nav.appointments", tourId: "nav-appointments", roles: ["Admin", "Doctor", "Receptionist", "Nurse"],
    icon: ic("M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z") },
  { to: "/consults", labelKey: "nav.consults", tourId: "nav-consults", roles: ["Admin", "Doctor", "Nurse"],
    icon: ic("M9 12h6M9 16h6M9 8h2M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6") },
  { to: "/lab", labelKey: "nav.lab", tourId: "nav-lab", roles: ["Admin", "Doctor", "LabTechnician", "Nurse"],
    icon: ic("M9 2v8.5L3.5 19a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L15 10.5V2M7 2h10") },
  { to: "/billing", labelKey: "nav.billing", tourId: "nav-billing", roles: ["Admin", "Receptionist"],
    icon: ic("M2 12h20M5 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z") },
];

const SECONDARY: NavItem[] = [
  { to: "/prescriptions", labelKey: "nav.prescriptions", roles: ["Admin", "Doctor"], icon: ic("M16 3h-8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM9 9h6M9 13h6M9 17h4") },
  { to: "/inventory", labelKey: "nav.inventory", roles: ["Admin", "Doctor", "Nurse"], icon: ic("M3 7l9-4 9 4M3 7v10l9 4M3 7l9 4M21 7l-9 4M12 11v10") },
  { to: "/caja", labelKey: "nav.caja", roles: ["Admin", "Receptionist"], icon: ic("M3 6h18v12H3zM3 10h18M7 14h4") },
  { to: "/hr", labelKey: "nav.hr", roles: ["Admin"], icon: ic("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8") },
  { to: "/reports", labelKey: "nav.reports", roles: ["Admin"], icon: ic("M3 3v18h18M7 14l4-4 4 4 6-6") },
  { to: "/settings", labelKey: "nav.settings", roles: ["Admin"], icon: ic("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z") },
  { to: "/audit", labelKey: "nav.audit", roles: ["Admin"], icon: ic("M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z") },
  { to: "/no-show", labelKey: "nav.noShow", roles: ["Admin"], icon: ic("M12 8v4M12 16h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z") },
];

const ROLE_LABEL_ES: Partial<Record<UserRole, string>> = {
  Admin: "Administrador", Doctor: "Doctor", Receptionist: "Recepción", Nurse: "Enfermería", LabTechnician: "Lab.",
};
const ROLE_LABEL_EN: Partial<Record<UserRole, string>> = {
  Admin: "Administrator", Doctor: "Doctor", Receptionist: "Reception", Nurse: "Nurse", LabTechnician: "Lab",
};

function Logo() {
  return (
    <div className="flex items-center gap-2 shrink-0 pr-1">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg leading-none"
        style={{ background: "#1c1b1f", color: "#ffffff" }}>
        L<span className="text-brand-400">.</span>
      </div>
    </div>
  );
}

function WorkspaceSelector() {
  const { user } = useAuthStore();
  return (
    <button type="button" className="hidden md:flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white/60 hover:bg-white transition-colors border border-white/40">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
        {(user?.fullName ?? "L").slice(0, 1).toUpperCase()}
      </div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[12px] font-semibold text-ink">Lova Salud</span>
        <span className="text-[9px] text-ink/50">Todos los grupos</span>
      </div>
      <svg className="w-3 h-3 text-ink/40 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function NavPill({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={item.to}
      data-tour={item.tourId}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
          isActive
            ? "bg-white text-ink shadow-sm"
            : "text-ink/70 hover:bg-white/50 hover:text-ink"
        }`
      }
    >
      <span className="opacity-80">{item.icon}</span>
      {t(item.labelKey)}
    </NavLink>
  );
}

function MoreMenu({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const hasActive = items.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
          hasActive ? "bg-white text-ink shadow-sm" : "text-ink/70 hover:bg-white/50 hover:text-ink"
        }`}>
        <svg className="w-[18px] h-[18px] opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
          <circle cx="5" cy="5" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="19" cy="5" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="19" r="1.5" /><circle cx="12" cy="19" r="1.5" /><circle cx="19" cy="19" r="1.5" />
        </svg>
        {t("nav.more")}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }} transition={{ duration: 0.14 }}
            className="absolute left-0 top-full mt-2 w-60 bg-white border border-surface-700/40 rounded-2xl shadow-xl p-1.5 z-50"
          >
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-500 text-white" : "text-ink/80 hover:bg-surface-200"
                  }`
                }>
                <span className="opacity-80">{item.icon}</span>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchBox() {
  return (
    <button type="button" className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white transition-colors border border-white/40 text-ink/60">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m21 21-4.3-4.3" />
      </svg>
      <span className="text-xs font-mono">⌘K</span>
    </button>
  );
}

function IconButton({ children, onClick, title, badge }: { children: React.ReactNode; onClick?: () => void; title?: string; badge?: number }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="relative w-9 h-9 rounded-full bg-white/60 hover:bg-white transition-colors border border-white/40 flex items-center justify-center text-ink/60 hover:text-ink">
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 bg-rose-500 border-2 border-surface-200">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function NotificationsBell() {
  const navigate = useNavigate();
  const { alerts } = useSystemAlerts();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconButton onClick={() => setOpen((p) => !p)} title={t("notifications.title")} badge={alerts.length}>
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }} transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-surface-700/40 rounded-2xl shadow-xl p-1.5 z-50 max-h-[70vh] overflow-y-auto">
            <div className="px-3 py-2 border-b border-surface-700/30 mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{t("notifications.title")}</p>
              <span className="text-xs text-ink/50">{alerts.length}</span>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-ink/50 px-3 py-6 text-center">{t("notifications.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-xl p-3 hover:bg-surface-200 cursor-pointer"
                    onClick={() => { if (a.action) { navigate(a.action.to); setOpen(false); } }}>
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severity === "critical" ? "bg-rose-500" : a.severity === "warning" ? "bg-amber-500" : "bg-brand-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{a.title}</p>
                        <p className="text-xs text-ink/60 mt-0.5">{a.message}</p>
                        {a.action && <p className="text-[10px] text-brand-600 mt-1">{a.action.label} →</p>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "es") as "es" | "en";
  const next: "es" | "en" = current === "es" ? "en" : "es";
  return (
    <button type="button" onClick={() => setLanguage(next)} title={`Switch to ${next.toUpperCase()}`}
      className="hidden md:flex w-9 h-9 rounded-full bg-white/60 hover:bg-white transition-colors border border-white/40 items-center justify-center text-[11px] font-bold text-ink/60">
      {current.toUpperCase()}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === "dark";
  return (
    <IconButton onClick={toggle} title={isDark ? "Modo claro" : "Modo oscuro"}>
      {isDark ? (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </IconButton>
  );
}

function FullscreenToggle() {
  const [isFs, setIsFs] = useState(false);
  return (
    <IconButton onClick={async () => setIsFs(await toggleFullscreen())} title={isFs ? "Salir" : "Pantalla completa"}>
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={isFs ? "M9 9V5H5M15 9V5h4M9 15v4H5M15 15v4h4" : "M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4"} />
      </svg>
    </IconButton>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [showEnable2FA, setShowEnable2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [is2FA, setIs2FA] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = user?.fullName?.split(" ").slice(0, 2).map((n) => n[0]).join("") ?? "?";
  const { i18n: i18nApi, t } = useTranslation();
  const lang = i18nApi.language?.startsWith("en") ? "en" : "es";
  const roleMap = lang === "en" ? ROLE_LABEL_EN : ROLE_LABEL_ES;
  const roleLabel = user?.roles[0] ? roleMap[user.roles[0]] ?? user.roles[0] : "";

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((p) => !p)} data-tour="user-menu"
        className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-xs font-bold text-white border-2 border-white/40 hover:border-white transition-colors">
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }} transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-60 bg-white border border-surface-700/40 rounded-2xl shadow-xl p-1.5 z-50">
            <div className="px-3 py-2 border-b border-surface-700/30 mb-1">
              <p className="text-sm font-semibold text-ink truncate">{user?.fullName}</p>
              <p className="text-xs text-ink/50 truncate">{user?.email}</p>
              <p className="text-[10px] text-ink/40 mt-1">{roleLabel}</p>
            </div>
            <button type="button" onClick={() => { setOpen(false); navigate("/settings"); }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-ink/80 hover:bg-surface-200">
              {t("user.config")}
            </button>
            <button type="button" onClick={() => { setOpen(false); is2FA ? setShowDisable2FA(true) : setShowEnable2FA(true); }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-ink/80 hover:bg-surface-200 flex items-center justify-between">
              <span>{t("user.twoFactor")}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${is2FA ? "bg-mint-200 text-mint-700" : "bg-surface-200 text-ink/50"}`}>
                {is2FA ? "On" : "Off"}
              </span>
            </button>
            <button type="button" onClick={() => { setOpen(false); logout(); navigate("/login"); }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-500/10">
              {t("user.logout")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <TwoFactorWizard open={showEnable2FA} onClose={() => setShowEnable2FA(false)} onEnabled={() => setIs2FA(true)} />
      <TwoFactorDisableModal open={showDisable2FA} onClose={() => setShowDisable2FA(false)} onDisabled={() => setIs2FA(false)} />
    </div>
  );
}

export function TopNav() {
  const { hasAnyRole } = useAuthStore();
  const primary = PRIMARY.filter((i) => hasAnyRole(i.roles));
  const secondary = SECONDARY.filter((i) => hasAnyRole(i.roles));

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-brand-200/70 via-brand-100/40 to-transparent pb-3" data-tour="topnav">
      <div className="flex items-center gap-3 px-6 py-3 flex-wrap">
        <Logo />
        <WorkspaceSelector />
        <div className="h-6 w-px bg-ink/10 mx-1 hidden md:block" />
        <nav className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
          {primary.map((item) => <NavPill key={item.to} item={item} />)}
          <MoreMenu items={secondary} />
        </nav>
        <div className="flex items-center gap-1.5 shrink-0">
          <SearchBox />
          <LanguageToggle />
          <ThemeToggle />
          <FullscreenToggle />
          <IconButton title="Ayuda">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
          </IconButton>
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
