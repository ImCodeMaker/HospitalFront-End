import { create } from "zustand";
import { setAccessToken, clearAccessToken } from "@/lib/axios";

export type UserRole =
  | "Admin"
  | "Doctor"
  | "Receptionist"
  | "LabTechnician"
  | "Nurse"
  | "PatientPortal";

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  specialtyId?: string;
  expiresAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isFirstLogin: boolean;
  setFirstLogin: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isFirstLogin: false,

  login: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    clearAccessToken();
    set({ user: null, isAuthenticated: false, isFirstLogin: false });
  },

  hasRole: (role) => get().user?.roles.includes(role) ?? false,

  hasAnyRole: (roles) =>
    roles.some((r) => get().user?.roles.includes(r)) ?? false,

  setFirstLogin: (v) => set({ isFirstLogin: v }),
}));
