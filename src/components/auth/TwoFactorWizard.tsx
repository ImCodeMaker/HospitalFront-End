import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { authApi } from "@/api/auth";
import { Modal } from "@/components/ui/Modal";

interface TwoFactorWizardProps {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
}

const INPUT = "bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500 w-full";

export function TwoFactorWizard({ open, onClose, onEnabled }: TwoFactorWizardProps) {
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setupMutation = useMutation({
    mutationFn: () => authApi.totpSetup(),
    onSuccess: async (res) => {
      const { qrCodeUri, manualEntryKey } = res.data;
      setManualKey(manualEntryKey);
      try {
        const url = await QRCode.toDataURL(qrCodeUri, { width: 220, margin: 1 });
        setQrDataUrl(url);
      } catch {
        setQrDataUrl(null);
      }
      setStep("verify");
    },
    onError: () => setError("No se pudo iniciar la configuración de 2FA."),
  });

  const enableMutation = useMutation({
    mutationFn: () => authApi.totpEnable(otp),
    onSuccess: () => {
      onEnabled();
      handleClose();
    },
    onError: () => setError("Código incorrecto. Intenta de nuevo."),
  });

  useEffect(() => {
    if (open && step === "setup" && !setupMutation.isPending) {
      setupMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setStep("setup");
    setQrDataUrl(null);
    setManualKey(null);
    setOtp("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Activar autenticación 2FA" maxWidth="max-w-md">
      {step === "setup" && (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <span className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-ink/60">Generando código QR…</p>
        </div>
      )}

      {step === "verify" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <ol className="text-sm text-ink/70 flex flex-col gap-1 list-decimal pl-5">
            <li>Abre tu app de autenticación (Google Authenticator, Authy, 1Password…)</li>
            <li>Escanea el código QR o introduce la clave manualmente</li>
            <li>Introduce el código de 6 dígitos generado</li>
          </ol>

          <div className="flex flex-col items-center gap-3 bg-surface-200/40 border border-surface-700/30 rounded-2xl p-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR para 2FA" className="rounded-lg bg-white p-2" />
            ) : (
              <p className="text-xs text-rose-500">No se pudo renderizar el código QR. Usa la clave manual.</p>
            )}
            {manualKey && (
              <div className="text-center">
                <p className="text-xs text-ink/50 uppercase tracking-wider">Clave manual</p>
                <p className="font-mono text-sm text-ink mt-1 select-all">{manualKey}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Código de 6 dígitos *</label>
            <input
              className={INPUT + " tracking-[0.4em] text-center text-xl font-mono"}
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink/60 hover:text-ink hover:bg-surface-200">Cancelar</button>
            <button
              type="button"
              onClick={() => { setError(null); enableMutation.mutate(); }}
              disabled={otp.length !== 6 || enableMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {enableMutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Activar 2FA
            </button>
          </div>
        </motion.div>
      )}
    </Modal>
  );
}

interface TwoFactorDisableModalProps {
  open: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export function TwoFactorDisableModal({ open, onClose, onDisabled }: TwoFactorDisableModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.totpDisable(password),
    onSuccess: () => { onDisabled(); setPassword(""); onClose(); },
    onError: () => setError("Contraseña incorrecta."),
  });

  return (
    <Modal open={open} onClose={onClose} title="Desactivar 2FA" maxWidth="max-w-sm">
      <form onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }} className="flex flex-col gap-3">
        <p className="text-sm text-ink/70">Confirma con tu contraseña actual para desactivar la verificación en dos pasos.</p>
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Contraseña *</label>
          <input type="password" className={INPUT} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink/60 hover:text-ink hover:bg-surface-200">Cancelar</button>
          <button type="submit" disabled={!password || mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Desactivar
          </button>
        </div>
      </form>
    </Modal>
  );
}
