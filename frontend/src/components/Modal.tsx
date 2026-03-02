import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  /** When false, modal body does not scroll - useful when only inner content should scroll */
  bodyScroll?: boolean;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, wide, bodyScroll = true, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative z-10 flex w-full max-h-[90vh] flex-col rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#222222] p-4 sm:p-7 shadow-2xl mx-3 sm:mx-4 ${bodyScroll ? 'overflow-y-auto' : 'overflow-hidden'} ${wide ? 'max-w-2xl' : 'max-w-md'}`}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {title && (
              <h2 className="mb-4 sm:mb-5 text-lg sm:text-xl font-semibold text-gray-100">{title}</h2>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
