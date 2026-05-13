import { gql } from "@apollo/client/core";

export interface AppointmentSummary {
  id: string;
  patientName: string;
  scheduledDate: string;
  durationMinutes: number;
  type: string;
  status: string;
  reason: string | null;
}

export interface LabOrderSummary {
  id: string;
  testName: string;
  priority: string;
  patientName: string;
  createdAt: string;
  isExternal: boolean;
}

export interface LowStockAlert {
  id: string;
  name: string;
  genericName: string;
  currentStock: number;
  minimumStockThreshold: number;
  isOutOfStock: boolean;
}

export interface DoctorDashboard {
  todayAppointmentCount: number;
  pendingConsultCount: number;
  unreviewedLabResultsCount: number;
  todayAppointments: AppointmentSummary[];
}

export interface AdminDashboard {
  totalActivePatients: number;
  todayConsultCount: number;
  monthConsultCount: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingInvoicesCount: number;
  lowStockCount: number;
  lowStockAlerts: LowStockAlert[];
}

export interface ReceptionistDashboard {
  todayAppointmentCount: number;
  confirmedCount: number;
  attendedCount: number;
  pendingBillingCount: number;
  todayAppointments: AppointmentSummary[];
}

export interface LabTechDashboard {
  pendingOrdersCount: number;
  urgentOrdersCount: number;
  inProgressCount: number;
  pendingOrders: LabOrderSummary[];
}

export const DOCTOR_DASHBOARD_QUERY = gql`
  query DoctorDashboard($doctorId: UUID!) {
    doctorDashboard(doctorId: $doctorId) {
      todayAppointmentCount
      pendingConsultCount
      unreviewedLabResultsCount
      todayAppointments {
        id
        patientName
        scheduledDate
        durationMinutes
        type
        status
        reason
      }
    }
  }
`;

export const ADMIN_DASHBOARD_QUERY = gql`
  query AdminDashboard {
    adminDashboard {
      totalActivePatients
      todayConsultCount
      monthConsultCount
      todayRevenue
      monthRevenue
      pendingInvoicesCount
      lowStockCount
      lowStockAlerts {
        id
        name
        genericName
        currentStock
        minimumStockThreshold
        isOutOfStock
      }
    }
  }
`;

export const RECEPTIONIST_DASHBOARD_QUERY = gql`
  query ReceptionistDashboard {
    receptionistDashboard {
      todayAppointmentCount
      confirmedCount
      attendedCount
      pendingBillingCount
      todayAppointments {
        id
        patientName
        scheduledDate
        durationMinutes
        type
        status
        reason
      }
    }
  }
`;

export const LAB_TECH_DASHBOARD_QUERY = gql`
  query LabTechDashboard {
    labTechDashboard {
      pendingOrdersCount
      urgentOrdersCount
      inProgressCount
      pendingOrders {
        id
        testName
        priority
        patientName
        createdAt
        isExternal
      }
    }
  }
`;
