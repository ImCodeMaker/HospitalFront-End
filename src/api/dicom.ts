import { api } from "@/lib/axios";

export interface DicomStudyDto {
  id: string;
  consultId: string;
  uploadedByUserId: string;
  originalFileName: string;
  fileSizeBytes: number;
  studyInstanceUid?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  description?: string;
  patientPosition?: string;
  createdAt: string;
}

export interface DicomStudyWithUrl {
  study: DicomStudyDto;
  url: string;
}

export interface UploadDicomMetadata {
  modality?: string;
  studyInstanceUid?: string;
  accessionNumber?: string;
  studyDate?: string;
  description?: string;
}

export const dicomApi = {
  listByConsult: async (consultId: string): Promise<DicomStudyDto[]> => {
    const { data } = await api.get<DicomStudyDto[]>(`/dicom/consult/${consultId}`);
    return data;
  },

  getById: async (studyId: string): Promise<DicomStudyWithUrl> => {
    const { data } = await api.get<DicomStudyWithUrl>(`/dicom/${studyId}`);
    return data;
  },

  upload: async (
    consultId: string,
    file: File,
    meta: UploadDicomMetadata = {}
  ): Promise<{ id: string }> => {
    const form = new FormData();
    form.append("file", file);
    if (meta.modality) form.append("modality", meta.modality);
    if (meta.studyInstanceUid) form.append("studyInstanceUid", meta.studyInstanceUid);
    if (meta.accessionNumber) form.append("accessionNumber", meta.accessionNumber);
    if (meta.studyDate) form.append("studyDate", meta.studyDate);
    if (meta.description) form.append("description", meta.description);

    const { data } = await api.post<{ id: string }>(`/dicom/consult/${consultId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  delete: async (studyId: string): Promise<void> => {
    await api.delete(`/dicom/${studyId}`);
  },
};
