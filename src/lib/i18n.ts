import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "lova:lang";

const initialLang: "es" | "en" = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch { /* ignore */ }
  return "es";
})();

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: {
      nav: {
        dashboard: "Panel",
        patients: "Pacientes",
        appointments: "Citas",
        consults: "Consultas",
        lab: "Laboratorio",
        billing: "Facturación",
        more: "Más",
        prescriptions: "Recetas",
        inventory: "Inventario",
        caja: "Caja",
        hr: "Recursos Humanos",
        reports: "Reportes",
        settings: "Configuración",
        audit: "Auditoría",
        noShow: "No-show",
      },
      user: {
        config: "Configuración",
        twoFactor: "Autenticación 2FA",
        logout: "Cerrar sesión",
      },
      common: {
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        edit: "Editar",
        create: "Crear",
        search: "Buscar",
        loading: "Cargando…",
        noData: "Sin datos",
        actions: "Acciones",
      },
      notifications: {
        title: "Notificaciones",
        empty: "✓ Sin alertas",
      },
      dashboard: {
        greeting: "Hola",
        customize: "Personalizar",
      },
    } },
    en: { translation: {
      nav: {
        dashboard: "Dashboard",
        patients: "Patients",
        appointments: "Appointments",
        consults: "Consults",
        lab: "Laboratory",
        billing: "Billing",
        more: "More",
        prescriptions: "Prescriptions",
        inventory: "Inventory",
        caja: "Cash register",
        hr: "Human resources",
        reports: "Reports",
        settings: "Settings",
        audit: "Audit",
        noShow: "No-show",
      },
      user: {
        config: "Settings",
        twoFactor: "2FA",
        logout: "Sign out",
      },
      common: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        search: "Search",
        loading: "Loading…",
        noData: "No data",
        actions: "Actions",
      },
      notifications: {
        title: "Notifications",
        empty: "✓ No alerts",
      },
      dashboard: {
        greeting: "Hi",
        customize: "Customize",
      },
    } },
  },
  lng: initialLang,
  fallbackLng: "es",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export function setLanguage(lang: "es" | "en") {
  i18n.changeLanguage(lang);
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
}

export default i18n;
