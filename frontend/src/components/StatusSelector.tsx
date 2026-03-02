import { useEffect, useRef, useState } from 'react';
import type { LibraryStatus } from '../types';

const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'playing', label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'dropped', label: 'Dropped' },
];

interface StatusSelectorProps {
  value: LibraryStatus;
  onChange: (status: LibraryStatus) => void;
  disabled?: boolean;
  variant?: 'compact' | 'full';
  layout?: 'flex' | 'grid';
  /** When set, shows a spinner on the button for this value */
  updatingValue?: LibraryStatus | null;
  /** When false, always show buttons (no dropdown on mobile). Default true for game detail page. */
  mobileAsDropdown?: boolean;
}

export default function StatusSelector({
  value,
  onChange,
  disabled = false,
  variant = 'full',
  layout = 'flex',
  updatingValue = null,
  mobileAsDropdown = true,
}: StatusSelectorProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMobileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
  const baseClass =
    variant === 'compact'
      ? 'rounded-lg border-2 border-white/20 px-4 py-3 text-[10px] font-pixel uppercase tracking-[0.12em] transition-all active:translate-x-[1px] active:translate-y-[1px]'
      : 'rounded-lg border-2 border-white/20 px-5 py-2.5 text-[10px] font-pixel uppercase tracking-[0.12em] transition-all active:translate-x-[1px] active:translate-y-[1px]';

  return (
    <div className="w-full sm:w-auto">
      {/* Mobile: dropdown (only when mobileAsDropdown is true) */}
      {mobileAsDropdown && (
      <div ref={ref} className="relative sm:hidden w-full">
        <button
          type="button"
          onClick={() => !disabled && setMobileOpen((o) => !o)}
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-lg border-2 border-white/20 bg-white/5 px-3 py-2 text-[9px] font-pixel uppercase tracking-[0.1em] text-gray-300 outline-none transition disabled:opacity-60"
        >
          {updatingValue === value ? (
            <span className="flex items-center gap-2">
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {currentLabel}
            </span>
          ) : (
            currentLabel
          )}
          <svg className={`h-2.5 w-2.5 transition ${mobileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-xl">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setMobileOpen(false);
                }}
                disabled={disabled}
                className={`block w-full px-3 py-2 text-left text-[9px] font-pixel uppercase tracking-[0.1em] transition ${
                  value === opt.value ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                } disabled:opacity-60`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Desktop (or always when mobileAsDropdown is false): buttons */}
      <div className={`${mobileAsDropdown ? 'hidden sm:block' : 'block'} ${layout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}`}>
        {STATUS_OPTIONS.map((opt) => {
          const isLoading = updatingValue === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className={`relative ${baseClass} ${
                value === opt.value
                  ? 'bg-white/[0.08] text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.3)] active:shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]'
                  : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/[0.04]'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              <span className={isLoading ? 'invisible' : ''}>{opt.label}</span>
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { STATUS_OPTIONS };
