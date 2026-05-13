import { api } from "@/lib/axios";
import type { NcfType } from "@/types/billing";

export interface NcfSequenceDto {
  id: string;
  type: NcfType;
  prefix: string;
  currentSequence: number;
  maxSequence: number;
  remaining: number;
  expirationDate: string;
  isActive: boolean;
  isExpired: boolean;
  isExhausted: boolean;
}

export interface CreateNcfRangeRequest {
  type: NcfType;
  startSequence: number;
  maxSequence: number;
  expirationDate: string;
}

export const ncfApi = {
  list: async (): Promise<NcfSequenceDto[]> => {
    const { data } = await api.get<NcfSequenceDto[]>("/ncfsequences");
    return data;
  },
  create: async (body: CreateNcfRangeRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/ncfsequences", body);
    return data;
  },
};
