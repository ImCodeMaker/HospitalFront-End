import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { DriveStep } from "driver.js";
import type { UserRole } from "@/store/authStore";

export function startOnboardingTour(role: UserRole) {
  const steps = getTourSteps(role);
  if (steps.length === 0) return;

  const d = driver({
    animate: true,
    overlayOpacity: 0.7,
    stagePadding: 8,
    allowClose: true,
    overlayClickBehavior: "nextStep",
    doneBtnText: "¡Listo!",
    nextBtnText: "Siguiente →",
    prevBtnText: "← Anterior",
    onDestroyed: () => {
      localStorage.setItem("lova_tour_done", "1");
    },
    steps,
  });

  d.drive();
}

function getTourSteps(role: UserRole): DriveStep[] {
  const common: DriveStep[] = [
    {
      element: "[data-tour='sidebar']",
      popover: {
        title: "Navegación",
        description:
          "Desde aquí accedes a todos los módulos del sistema. Los íconos cambian según tu rol.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "[data-tour='user-menu']",
      popover: {
        title: "Tu perfil",
        description: "Accede a configuración personal, 2FA y cerrar sesión.",
        side: "right",
        align: "end",
      },
    },
  ];

  const byRole: Partial<Record<UserRole, DriveStep[]>> = {
    Admin: [
      ...common,
      {
        element: "[data-tour='dashboard-stats']",
        popover: {
          title: "Panel de control",
          description:
            "Resumen en tiempo real: ingresos, citas, inventario y alertas.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='nav-reports']",
        popover: {
          title: "Reportes",
          description:
            "Genera reportes de ingresos, cuentas por cobrar e inventario en PDF o CSV.",
          side: "right",
          align: "center",
        },
      },
    ],
    Doctor: [
      ...common,
      {
        element: "[data-tour='nav-consults']",
        popover: {
          title: "Consultas",
          description:
            "Gestiona tus consultas activas. Registra signos vitales, diagnóstico y tratamiento.",
          side: "right",
          align: "center",
        },
      },
      {
        element: "[data-tour='nav-prescriptions']",
        popover: {
          title: "Recetas",
          description:
            "Emite recetas y verifica interacciones medicamentosas en tiempo real (RxNorm).",
          side: "right",
          align: "center",
        },
      },
    ],
    Receptionist: [
      ...common,
      {
        element: "[data-tour='nav-appointments']",
        popover: {
          title: "Citas",
          description: "Agenda, confirma y reprograma citas de pacientes.",
          side: "right",
          align: "center",
        },
      },
      {
        element: "[data-tour='nav-patients']",
        popover: {
          title: "Pacientes",
          description:
            "Registra nuevos pacientes y verifica duplicados por documento.",
          side: "right",
          align: "center",
        },
      },
    ],
  };

  return byRole[role] ?? common;
}
