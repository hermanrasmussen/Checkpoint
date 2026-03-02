import type { LibraryStatus } from '../types';

const config: Record<LibraryStatus, { bg: string; text: string; label: string }> = {
  playing: { bg: 'bg-neon-green/10', text: 'text-neon-green', label: 'Playing' },
  completed: { bg: 'bg-neon-blue/10', text: 'text-neon-blue', label: 'Completed' },
  backlog: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Backlog' },
  dropped: { bg: 'bg-neon-pink/10', text: 'text-neon-pink', label: 'Dropped' },
};

export default function StatusBadge({ status, size = 'sm' }: { status: LibraryStatus; size?: 'sm' | 'md' }) {
  const c = config[status];
  return (
    <span
      className={`inline-block rounded-sm font-bold uppercase tracking-wider ${c.bg} ${c.text} ${
        size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
      }`}
    >
      {c.label}
    </span>
  );
}
