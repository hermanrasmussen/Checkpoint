import { useState } from 'react';
import Modal from './Modal';
import { api } from '../lib/api';
import { useProfile } from '../context/ProfileContext';
import { useToast } from './Toast';

interface SteamConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SteamConnectModal({ open, onClose, onSuccess }: SteamConnectModalProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshProfile } = useProfile();
  const { toast } = useToast();

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/steam/connect', { steam_id_or_vanity: trimmed });
      await refreshProfile();
      toast.success('Steam profile connected');
      setInput('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect Steam profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect Steam Profile">
      <div className="space-y-4">
        <p className="text-base sm:text-sm text-gray-400 leading-relaxed">
          Enter your Steam profile URL or custom ID to view your achievements.
        </p>

        <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 sm:p-3 text-sm sm:text-xs text-gray-500 leading-relaxed">
          <p className="font-semibold text-gray-400">How to find your Steam ID:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Steam and go to your profile</li>
            <li>Click "Edit Profile" then look at the URL in your browser</li>
            <li>
              It will be either{' '}
              <span className="text-gray-300 font-mono text-xs sm:text-[11px]">steamcommunity.com/profiles/76561198...</span>{' '}
              or{' '}
              <span className="text-gray-300 font-mono text-xs sm:text-[11px]">steamcommunity.com/id/yourname</span>
            </li>
            <li>Paste the full URL or just the ID/username below</li>
          </ol>
          <p className="pt-1">
            Your game details must be set to <span className="text-gray-300">Public</span> in{' '}
            <span className="text-gray-300">Steam &gt; Profile &gt; Edit Profile &gt; Privacy Settings</span>.
          </p>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
          placeholder="https://steamcommunity.com/id/username"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base sm:text-sm text-gray-200 placeholder-gray-600 outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
        />

        {error && (
          <p className="text-sm sm:text-xs text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-white/20 px-4 py-2.5 text-xs sm:text-[10px] font-pixel uppercase tracking-[0.12em] text-gray-400 transition hover:text-white hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="rounded-lg border-2 border-white/20 bg-white/10 px-4 py-2.5 text-xs sm:text-[10px] font-pixel uppercase tracking-[0.12em] text-gray-300 transition-all hover:bg-white/15 hover:text-white active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-30 disabled:cursor-not-allowed shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
