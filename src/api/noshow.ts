import { api } from "@/lib/axios";

export interface NoShowOutreachEntry {
  id: string;
  appointmentId: string;
  appointmentDate?: string;
  contactedAt: string;
  channel: string;
  notes?: string;
  patientResponded: boolean;
}

export interface NoShowOutreachGroup {
  patientId: string;
  patientName: string;
  outreachCount: number;
  lastContactedAt: string;
  isRepeatOffender: boolean;
  entries: NoShowOutreachEntry[];
}

export interface NoShowOutreachResponse {
  total: number;
  items: NoShowOutreachGroup[];
}

export const noShowApi = {
  list: async (days = 90, patientId?: string): Promise<NoShowOutreachResponse> => {
    const { data } = await api.get<NoShowOutreachResponse>("/noshowoutreach", {
      params: { days, patientId: patientId || undefined },
    });
    return data;
  },
};
