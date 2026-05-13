import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function ErrorBoundaryPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const isRoute = isRouteErrorResponse(error);
  const status = isRoute ? error.status : 500;
  const statusText = isRoute ? error.statusText : "Algo salió mal";
  const message =
    error instanceof Error ? error.message :
    isRoute ? (typeof error.data === "string" ? error.data : JSON.stringify(error.data)) :
    "Error inesperado en la aplicación.";
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-100 border border-surface-700/40 rounded-3xl p-8 max-w-2xl w-full shadow-[0_1px_2px_rgba(15,15,15,0.04),0_8px_24px_rgba(15,15,15,0.06)]"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl shrink-0">
            ⚠
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-ink/50 uppercase tracking-wider">Error {status}</p>
            <h1 className="text-2xl font-bold text-ink mt-1 tracking-tight">{statusText}</h1>
            <p className="text-sm text-ink/70 mt-3 break-words">{message}</p>
          </div>
        </div>

        {stack && (
          <details className="mt-5 group">
            <summary className="text-xs font-medium text-ink/60 cursor-pointer hover:text-ink">
              Detalles técnicos
            </summary>
            <pre className="mt-2 text-[10px] font-mono text-ink/50 bg-surface-200 border border-surface-700/30 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
              {stack}
            </pre>
          </details>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink/70 hover:text-ink bg-surface-200 hover:bg-surface-300 transition-colors"
          >
            ← Volver
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
          >
            Recargar página
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink/70 hover:text-ink hover:bg-surface-200"
          >
            Ir al panel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
