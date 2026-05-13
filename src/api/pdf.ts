import { api } from "@/lib/axios";

export const pdfApi = {
  invoice: async (invoiceId: string): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/pdf/invoice/${invoiceId}`, {
      responseType: "blob",
    });
    return data;
  },

  sickNote: async (consultId: string): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/pdf/sick-note/${consultId}`, {
      responseType: "blob",
    });
    return data;
  },

  prescription: async (consultId: string): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/pdf/prescription/${consultId}`, {
      responseType: "blob",
    });
    return data;
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
