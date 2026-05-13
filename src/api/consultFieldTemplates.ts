import { api } from "@/lib/axios";

export type ConsultFieldType = "text" | "number" | "select" | "checkbox" | "date" | "textarea";

export interface ConsultFieldTemplateDto {
  id: string;
  specialtyId: string;
  fieldKey: string;
  label: string;
  fieldType: ConsultFieldType;
  fieldOptions?: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface CreateConsultFieldTemplateRequest {
  specialtyId: string;
  fieldKey: string;
  label: string;
  fieldType: ConsultFieldType;
  fieldOptions?: string;
  isRequired: boolean;
  displayOrder: number;
}

export interface UpdateConsultFieldTemplateRequest {
  label?: string;
  fieldOptions?: string;
  isRequired?: boolean;
  displayOrder?: number;
}

export const consultFieldTemplatesApi = {
  listBySpecialty: async (specialtyId: string): Promise<ConsultFieldTemplateDto[]> => {
    const { data } = await api.get<ConsultFieldTemplateDto[]>(
      `/consultfieldtemplates/by-specialty/${specialtyId}`
    );
    return data;
  },

  create: async (body: CreateConsultFieldTemplateRequest): Promise<{ id: string }> => {
    const { data } = await api.post<{ id: string }>("/consultfieldtemplates", body);
    return data;
  },

  update: async (id: string, body: UpdateConsultFieldTemplateRequest): Promise<{ id: string }> => {
    const { data } = await api.put<{ id: string }>(`/consultfieldtemplates/${id}`, body);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/consultfieldtemplates/${id}`);
  },
};
