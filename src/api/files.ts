import { api } from "@/lib/axios";

export type UploadFolder =
  | "consult-images"
  | "lab-results"
  | "insurance-cards"
  | "documents"
  | "hr-documents";

export interface UploadResponse {
  path: string;
  url: string;
}

export const filesApi = {
  upload: async (folder: UploadFolder, file: File): Promise<{ filePath: string; url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<UploadResponse>(`/files/${folder}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { filePath: data.path, url: data.url };
  },

  delete: async (path: string): Promise<void> => {
    await api.delete(`/files`, { params: { path } });
  },
};
