import { api } from "@/lib/axios";
import type {
  EmployeeDto,
  EmployeePaginatedResult,
  EmployeeListParams,
  EmployeePerformanceDto,
  PayrollRecordDto,
  PayrollListParams,
  RecruitmentApplicationDto,
  RecruitmentListParams,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GeneratePayrollRequest,
  CreateRecruitmentApplicationRequest,
  RecruitmentStage,
} from "@/types/hr";

export const hrApi = {
  listEmployees: async (params: EmployeeListParams = {}): Promise<EmployeePaginatedResult> => {
    const { data } = await api.get<EmployeePaginatedResult>("/hr", {
      params: {
        search: params.search || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return data;
  },

  getEmployee: async (id: string): Promise<EmployeeDto> => {
    const { data } = await api.get<EmployeeDto>(`/hr/${id}`);
    return data;
  },

  getPerformance: async (
    id: string,
    from: string,
    to: string
  ): Promise<EmployeePerformanceDto> => {
    const { data } = await api.get<EmployeePerformanceDto>(
      `/hr/${id}/performance`,
      { params: { from, to } }
    );
    return data;
  },

  createEmployee: async (body: CreateEmployeeRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/hr", body);
    return data;
  },

  updateEmployee: async (id: string, body: UpdateEmployeeRequest): Promise<void> => {
    await api.put(`/hr/${id}`, body);
  },

  listPayroll: async (params: PayrollListParams = {}): Promise<PayrollRecordDto[]> => {
    const { data } = await api.get<PayrollRecordDto[]>("/payroll", {
      params: {
        period: params.period || undefined,
        status: params.status || undefined,
      },
    });
    return data;
  },

  generatePayroll: async (body: GeneratePayrollRequest): Promise<PayrollRecordDto> => {
    const { data } = await api.post<PayrollRecordDto>("/payroll", body);
    return data;
  },

  approvePayroll: async (id: string): Promise<void> => {
    await api.post(`/payroll/${id}/approve`);
  },

  markPayrollPaid: async (id: string): Promise<void> => {
    await api.post(`/payroll/${id}/mark-paid`);
  },

  listRecruitment: async (
    params: RecruitmentListParams = {}
  ): Promise<RecruitmentApplicationDto[]> => {
    const { data } = await api.get<RecruitmentApplicationDto[]>("/recruitment", {
      params: { stage: params.stage || undefined },
    });
    return data;
  },

  createApplication: async (
    body: CreateRecruitmentApplicationRequest
  ): Promise<RecruitmentApplicationDto> => {
    const { data } = await api.post<RecruitmentApplicationDto>("/recruitment", body);
    return data;
  },

  advanceStage: async (
    id: string,
    stage: RecruitmentStage,
    notes?: string
  ): Promise<void> => {
    await api.patch(`/recruitment/${id}/stage`, { stage, notes });
  },
};
