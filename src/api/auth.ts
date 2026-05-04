import { api } from "@/lib/axios";
import type { AuthUser } from "@/store/authStore";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  roles: AuthUser["roles"];
  specialtyId?: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<LoginResponse>("/auth/login", data),

  loginWithTotp: (data: { email: string; password: string; totpCode: string }) =>
    api.post<LoginResponse>("/auth/2fa/login", data),

  refresh: () =>
    api.post<{ accessToken: string; expiresAt: string }>("/auth/refresh", {}),

  revoke: () => api.post("/auth/revoke"),

  totpSetup: () =>
    api.post<{ secret: string; qrCodeUri: string; manualEntryKey: string }>(
      "/auth/2fa/setup"
    ),

  totpEnable: (totpCode: string) =>
    api.post("/auth/2fa/enable", { totpCode }),

  totpDisable: (currentPassword: string) =>
    api.post("/auth/2fa/disable", { currentPassword }),
};
