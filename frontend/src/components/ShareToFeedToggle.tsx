import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PIXEL_BURST_COUNT = 8;
const PIXEL_ANGLES = Array.from({ length: PIXEL_BURST_COUNT }, (_, i) => (i * 360) / PIXEL_BURST_COUNT);

interface ShareToFeedToggleProps {
  enabled: boolean;
  caption: string;
  onEnabledChange: (enabled: boolean) => void;
  onCaptionChange: (caption: string) => void;
}

export default function ShareToFeedToggle({
  enabled,
  caption,
  onEnabledChange,
  onCaptionChange,
}: ShareToFeedToggleProps) {
  const prevEnabled = useRef(enabled);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (enabled && !prevEnabled.current) {
      setShowBurst(true);
      const t = setTimeout(() => setShowBurst(false), 450);
      return () => clearTimeout(t);
    }
    prevEnabled.current = enabled;
  }, [enabled]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <motion.button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onEnabledChange(!enabled)}
        whileTap={{ scale: 0.97 }}
        className={`relative flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-[10px] font-pixel uppercase tracking-[0.12em] transition-all ${
          enabled
            ? 'border-neon-green/40 bg-neon-green/10 text-neon-green shadow-[3px_3px_0_0_rgba(0,100,80,0.3)]'
            : 'border-white/20 bg-transparent text-gray-500 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        <span className="relative">
          <svg className="h-4 w-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <AnimatePresence>
            {showBurst &&
              PIXEL_ANGLES.map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const dist = 10;
                const x = Math.cos(rad) * dist;
                const y = -Math.sin(rad) * dist;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x,
                      y,
                      scale: 0.5,
                      transition: { duration: 0.35, ease: 'easeOut' },
                    }}
                    exit={{ opacity: 0 }}
                    className="absolute left-1/2 top-1/2 w-1 h-1 -ml-0.5 -mt-0.5 bg-neon-green pointer-events-none"
                  />
                );
              })}
          </AnimatePresence>
        </span>
        Share to Feed
      </motion.button>
      {enabled && (
        <input
          type="text"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Add a caption (optional)"
          maxLength={280}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none transition focus:border-white/20"
        />
      )}
    </div>
  );
}
