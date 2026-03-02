import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PixelButton from './PixelButton';

type ToastVariant = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
  };
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'border-red-500/30 bg-red-950/80 text-red-300',
  success: 'border-neon-green/30 bg-emerald-950/80 text-neon-green',
  info: 'border-white/10 bg-[#252525]/90 text-gray-300',
};

const VARIANT_ICONS: Record<ToastVariant, ReactNode> = {
  error: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  success: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
};

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(0);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    error: (message: string) => addToast(message, 'error'),
    success: (message: string) => addToast(message, 'success'),
    info: (message: string) => addToast(message, 'info'),
  };

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (accepted: boolean) => {
    confirmState?.resolve(accepted);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-lg text-sm max-w-sm ${VARIANT_STYLES[t.variant]}`}
            >
              {VARIANT_ICONS[t.variant]}
              <span className="flex-1 min-w-0 break-words">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-current opacity-50 transition hover:opacity-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleConfirm(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#222222] p-7 shadow-2xl mx-4"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <p className="text-base text-gray-200 leading-relaxed">{confirmState.message}</p>
              <div className="mt-6 flex justify-end gap-3">
                <PixelButton variant="secondary" type="button" onClick={() => handleConfirm(false)}>
                  Cancel
                </PixelButton>
                <PixelButton variant="danger" type="button" onClick={() => handleConfirm(true)}>
                  Confirm
                </PixelButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
