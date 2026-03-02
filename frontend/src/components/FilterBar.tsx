import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LibraryStatus } from '../types';

interface FilterBarProps {
  currentStatus: LibraryStatus | null;
  onStatusChange: (status: LibraryStatus | null) => void;
  currentSort: string;
  onSortChange: (sort: string) => void;
  /** Optional content to render left of the status dropdown (e.g. New Collection button) */
  leftContent?: ReactNode;
}

const statuses: { value: LibraryStatus | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'playing', label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'dropped', label: 'Dropped' },
];

const sorts = [
  { value: 'date_added', label: 'Date Added' },
  { value: 'rating', label: 'Rating' },
  { value: 'release_year', label: 'Release Year' },
  { value: 'title', label: 'Title' },
];

export default function FilterBar({ currentStatus, onStatusChange, currentSort, onSortChange, leftContent }: FilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (sortRef.current && !sortRef.current.contains(target)) setSortOpen(false);
      if (statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortLabel = sorts.find((s) => s.value === currentSort)?.label ?? 'Date Added';
  const currentStatusLabel = statuses.find((s) => s.value === currentStatus)?.label ?? 'All';

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {leftContent}
      <div className="flex flex-nowrap items-center gap-2 sm:gap-3 shrink-0">
      {/* Status dropdown */}
      <div ref={statusRef} className="relative">
        <button
          type="button"
          onClick={() => setStatusOpen((o) => !o)}
          className="flex items-center gap-1.5 sm:gap-2 rounded-lg border-2 border-white/20 px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] text-gray-400 outline-none transition hover:bg-white/[0.04]"
        >
          {currentStatusLabel}
          <svg className={`h-2.5 w-2.5 sm:h-3 sm:w-3 transition ${statusOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {statusOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-xl">
            {statuses.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  onStatusChange(s.value);
                  setStatusOpen(false);
                }}
                className={`block w-full px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] transition ${
                  currentStatus === s.value ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={sortRef} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((o) => !o)}
          className="flex items-center gap-1.5 sm:gap-2 rounded-lg border-2 border-white/20 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] text-gray-400 outline-none transition hover:bg-white/[0.07] focus:border-white/30"
        >
          {currentSortLabel}
          <svg className={`h-2.5 w-2.5 sm:h-3 sm:w-3 transition ${sortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {sortOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-xl">
            {sorts.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  onSortChange(s.value);
                  setSortOpen(false);
                }}
                className={`block w-full px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] transition ${
                  currentSort === s.value
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
