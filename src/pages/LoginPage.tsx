import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setFirstLogin = useAuthStore((s) => s.setFirstLogin);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMut = useMutation({
    mutationFn: () =>
      needsTotp
        ? authApi.loginWithTotp({ email, password, totpCode })
        : authApi.login({ email, password }),
    onSuccess: ({ data }) => {
      login(
        {
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          roles: data.roles,
          specialtyId: data.specialtyId,
          expiresAt: data.expiresAt,
        },
        data.accessToken
      );

      const isFirstLogin = !localStorage.getItem("lova_tour_done");
      if (isFirstLogin) setFirstLogin(true);

      navigate("/dashboard", { replace: true });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Credenciales inválidas.";
      if (msg.toLowerCase().includes("totp") || msg.toLowerCase().includes("2fa")) {
        setNeedsTotp(true);
        setError(null);
      } else {
        setError(msg);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
              <path d="M36 14v44M14 36h44" stroke="white" strokeWidth="7" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-ink">Lova Salud</h1>
            <p className="text-xs text-slate-500 mt-0.5">Clinical Management System</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-900 border border-surface-700/50 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-ink mb-1">
            {needsTotp ? "Verificación 2FA" : "Iniciar sesión"}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {needsTotp
              ? "Ingresa el código de tu autenticador"
              : "Ingresa tus credenciales para continuar"}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              loginMut.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <AnimatePresence mode="wait">
              {!needsTotp ? (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                      placeholder="usuario@lovasalud.com"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="totp"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                >
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Código de autenticación (6 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition tracking-[0.4em] text-center text-xl font-mono"
                    placeholder="000000"
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loginMut.isPending}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loginMut.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </>
              ) : needsTotp ? (
                "Verificar código"
              ) : (
                "Iniciar sesión"
              )}
            </button>

            {needsTotp && (
              <button
                type="button"
                onClick={() => {
                  setNeedsTotp(false);
                  setTotpCode("");
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition text-center"
              >
                ← Volver a credenciales
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Lova Salud v0.1 — © 2026
        </p>
      </motion.div>
    </div>
  );
}
