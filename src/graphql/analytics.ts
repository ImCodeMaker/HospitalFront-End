import { gql } from "@apollo/client/core";

export interface RevenueTrendPoint {
  date: string;
  total: number;
}

export interface SpecialtyVolumeSlice {
  specialtyId: string;
  specialty: string;
  count: number;
}

export interface DiagnosisFrequency {
  diagnosisCode: string;
  description: string;
  count: number;
}

export interface DoctorRevenueSlice {
  doctorId: string;
  doctorName: string;
  totalRevenue: number;
  consultCount: number;
}

export interface PaymentMethodSlice {
  method: string;
  count: number;
  total: number;
}

export const REVENUE_TREND_QUERY = gql`
  query RevenueTrend($days: Int!) {
    revenueTrend(days: $days) { date total }
  }
`;

export const CONSULTS_BY_SPECIALTY_QUERY = gql`
  query ConsultsBySpecialty($days: Int!) {
    consultsBySpecialty(days: $days) { specialtyId specialty count }
  }
`;

export const TOP_DIAGNOSES_QUERY = gql`
  query TopDiagnoses($top: Int!, $days: Int!) {
    topDiagnoses(top: $top, days: $days) { diagnosisCode description count }
  }
`;

export const REVENUE_BY_DOCTOR_QUERY = gql`
  query RevenueByDoctor($days: Int!) {
    revenueByDoctor(days: $days) { doctorId doctorName totalRevenue consultCount }
  }
`;

export const PAYMENT_METHOD_DISTRIBUTION_QUERY = gql`
  query PaymentMethodDistribution($days: Int!) {
    paymentMethodDistribution(days: $days) { method count total }
  }
`;

export const NO_SHOW_RATE_QUERY = gql`
  query NoShowRate($days: Int!) {
    noShowRate(days: $days)
  }
`;

export const LAB_TURNAROUND_QUERY = gql`
  query LabTurnaround($days: Int!) {
    averageLabTurnaroundHours(days: $days)
  }
`;

export interface AgeBucket {
  range: string;
  count: number;
}

export interface GenderSlice {
  gender: string;
  count: number;
}

export interface DemographicsReport {
  totalActive: number;
  ageBuckets: AgeBucket[];
  genderBreakdown: GenderSlice[];
}

export interface PrescriptionFrequency {
  drugName: string;
  count: number;
  uniquePatients: number;
}

export interface ConsultVolumeByDoctorRow {
  doctorId: string;
  doctorName: string;
  consultCount: number;
  averageMinutes: number;
}

export interface StaffPerformanceRow {
  userId: string;
  fullName: string;
  role: string;
  patientsAttended: number;
  revenueGenerated: number;
  completedTasks: number;
}

export interface ControlledSubstanceEntry {
  medicationId: string;
  medicationName: string;
  classCode: string | null;
  currentStock: number;
  dispensed30d: number;
  lastDispensedAt: string | null;
}

export const PATIENT_DEMOGRAPHICS_QUERY = gql`
  query PatientDemographics {
    patientDemographics {
      totalActive
      ageBuckets { range count }
      genderBreakdown { gender count }
    }
  }
`;

export const PRESCRIPTION_ANALYSIS_QUERY = gql`
  query PrescriptionAnalysis($top: Int!, $days: Int!) {
    prescriptionAnalysis(top: $top, days: $days) {
      drugName
      count
      uniquePatients
    }
  }
`;

export const CONSULT_VOLUME_BY_DOCTOR_QUERY = gql`
  query ConsultVolumeByDoctor($days: Int!) {
    consultVolumeByDoctor(days: $days) {
      doctorId
      doctorName
      consultCount
      averageMinutes
    }
  }
`;

export const STAFF_PERFORMANCE_QUERY = gql`
  query StaffPerformance($days: Int!) {
    staffPerformance(days: $days) {
      userId
      fullName
      role
      patientsAttended
      revenueGenerated
      completedTasks
    }
  }
`;

export const CONTROLLED_SUBSTANCE_LOG_QUERY = gql`
  query ControlledSubstanceLog {
    controlledSubstanceLog {
      medicationId
      medicationName
      classCode
      currentStock
      dispensed30d
      lastDispensedAt
    }
  }
`;
