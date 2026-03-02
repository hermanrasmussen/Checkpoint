import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api';
import type { GameSummary, GridItem, LibraryEntry, LibraryStatus, SteamAchievementsResponse } from '../types';
import StatusBadge from '../components/StatusBadge';
import StatusSelector from '../components/StatusSelector';
import StarRating from '../components/StarRating';
import PixelButton from '../components/PixelButton';
import ShareToFeedToggle from '../components/ShareToFeedToggle';
import Modal from '../components/Modal';
import SteamConnectModal from '../components/SteamConnectModal';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../components/Toast';

export default function GameDetailPage() {
  const { apiId } = useParams<{ apiId: string }>();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { profile } = useProfile();

  const [game, setGame] = useState<GameSummary | null>(null);
  const [entry, setEntry] = useState<LibraryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [steamConnectOpen, setSteamConnectOpen] = useState(false);
  const [achievements, setAchievements] = useState<SteamAchievementsResponse | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [achievementsRefetchTrigger, setAchievementsRefetchTrigger] = useState(0);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStatus, setAddStatus] = useState<LibraryStatus>('backlog');
  const [shareToFeed, setShareToFeed] = useState(false);
  const [caption, setCaption] = useState('');
  const [adding, setAdding] = useState(false);

  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [grids, setGrids] = useState<GridItem[]>([]);
  const [gridsLoading, setGridsLoading] = useState(false);
  const [selectedGridUrl, setSelectedGridUrl] = useState<string | null>(null);
  const [savingArtwork, setSavingArtwork] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<LibraryStatus | null>(null);
  const [updatingRating, setUpdatingRating] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!apiId) return;
    setLoading(true);
    setError(null);
    try {
      const [gameData, entries] = await Promise.all([
        api.get<GameSummary>(`/games/${apiId}`),
        api.get<LibraryEntry[]>(`/library?api_id=${apiId}`),
      ]);
      setGame(gameData);
      setEntry(entries.length > 0 ? entries[0] : null);
    } catch (err: any) {
      setError(err.message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [apiId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!apiId || !profile?.steam_id || !game) {
      setAchievements(null);
      return;
    }
    let cancelled = false;
    setAchievementsLoading(true);
    api
      .get<SteamAchievementsResponse>(`/steam/achievements?api_id=${apiId}`)
      .then((data) => {
        if (!cancelled) setAchievements(data);
      })
      .catch(() => {
        if (!cancelled) setAchievements(null);
      })
      .finally(() => {
        if (!cancelled) setAchievementsLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiId, profile?.steam_id, game, achievementsRefetchTrigger]);

  const handleStatusChange = async (status: LibraryStatus) => {
    if (!entry || updatingStatus) return;
    setUpdatingStatus(status);
    try {
      const updated = await api.patch<LibraryEntry>(`/library/${entry.id}`, { status });
      setEntry(updated);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!entry || updatingRating) return;
    setUpdatingRating(true);
    try {
      const updated = await api.patch<LibraryEntry>(`/library/${entry.id}`, { rating });
      setEntry(updated);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingRating(false);
    }
  };

  const handleRemove = async () => {
    if (!entry) return;
    const ok = await confirm('Remove this game from your library?');
    if (!ok) return;
    setRemoving(true);
    try {
      await api.delete(`/library/${entry.id}`);
      setEntry(null);
      toast.success('Removed from library');
    } catch (err: any) {
      toast.error(err.message || 'Remove failed');
    } finally {
      setRemoving(false);
    }
  };

  const handleAdd = async () => {
    if (!game) return;
    setAdding(true);
    try {
      const created = await api.post<LibraryEntry>('/library', {
        api_id: game.api_id,
        status: addStatus,
        share_to_feed: shareToFeed,
        caption: shareToFeed && caption.trim() ? caption.trim() : null,
      });
      setEntry(created);
      setAddModalOpen(false);
      setShareToFeed(false);
      setCaption('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleShareToFeed = async () => {
    if (!entry) return;
    setSharing(true);
    try {
      await api.post('/feed', { library_entry_id: entry.id });
      setShared(true);
    } catch (err: any) {
      if (err.message?.includes('Already shared')) {
        setShared(true);
      } else {
        toast.error(err.message || 'Failed to share');
      }
    } finally {
      setSharing(false);
    }
  };

  const openArtworkModal = async () => {
    if (!game) return;
    setArtworkModalOpen(true);
    setSelectedGridUrl(game.grid_url || game.cover_url);
    setGridsLoading(true);
    try {
      const items = await api.get<GridItem[]>(`/games/${game.api_id}/grids`);
      setGrids(items);
    } catch {
      setGrids([]);
    } finally {
      setGridsLoading(false);
    }
  };

  const confirmArtwork = async () => {
    if (!game || !selectedGridUrl) return;
    setSavingArtwork(true);
    try {
      const updated = await api.patch<GameSummary>(`/games/${game.api_id}/artwork`, { grid_url: selectedGridUrl });
      setGame(updated);
      setArtworkModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update artwork');
    } finally {
      setSavingArtwork(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-6 sm:gap-8 sm:flex-row">
          <div className="h-52 w-36 sm:h-96 sm:w-64 shrink-0 rounded-xl sm:rounded-2xl bg-white/5" />
          <div className="flex-1 space-y-5">
            <div className="h-10 w-2/3 rounded-lg bg-white/5" />
            <div className="h-5 w-1/4 rounded-lg bg-white/5" />
            <div className="h-5 w-1/3 rounded-lg bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <p className="text-red-400 text-base">{error || 'Game not found'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-gray-400 hover:text-white text-sm transition">
          Go back
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 sm:space-y-10"
    >
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-500 transition hover:text-white"
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Library
      </button>

      <div className="flex flex-col gap-6 sm:gap-10 sm:flex-row">
        <div className="shrink-0 flex flex-col items-center">
          {(game.grid_url || game.cover_url) ? (
            <img
              src={game.grid_url || game.cover_url!}
              alt={game.title}
              className="w-48 sm:w-80 rounded-xl sm:rounded-2xl object-cover shadow-2xl shadow-black/40"
            />
          ) : (
            <div className="flex aspect-[2/3] w-48 sm:w-80 items-center justify-center rounded-xl sm:rounded-2xl bg-white/5 text-gray-600 text-sm">
              No image
            </div>
          )}
          <button
            onClick={openArtworkModal}
            className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-pixel uppercase tracking-[0.12em] text-gray-500 transition hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Change artwork
          </button>
        </div>

        <div className="flex-1 space-y-4 sm:space-y-7 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{game.title}</h1>
            {game.developer && <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-400">{game.developer}</p>}
            {game.release_year && <p className="mt-1 text-sm sm:text-base text-gray-600">{game.release_year}</p>}
            {game.genre.length > 0 && (
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                {game.genre.map((g) => (
                  <span key={g} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm text-gray-400">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {entry ? (
            <div className="space-y-4 sm:space-y-6 rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-7">
              <div>
                <p className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-gray-500">Status</p>
                <StatusSelector
                  value={entry.status}
                  onChange={handleStatusChange}
                  layout="flex"
                  disabled={!!updatingStatus}
                  updatingValue={updatingStatus}
                />
              </div>

              <div className={updatingRating ? 'opacity-50 pointer-events-none transition' : 'transition'}>
                <p className="mb-3 text-sm font-medium text-gray-500">Rating</p>
                <StarRating value={entry.rating} onChange={handleRatingChange} size="lg" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 sm:pt-6">
                <StatusBadge status={entry.status} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareToFeed}
                    disabled={sharing || shared}
                    className={`flex items-center gap-1.5 sm:gap-2 rounded-lg border-2 border-white/20 px-3 py-2 sm:px-4 sm:py-2.5 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                      shared
                        ? 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]'
                        : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {shared ? 'Shared' : sharing ? 'Sharing...' : 'Share to Feed'}
                  </button>
                  <PixelButton variant="danger" onClick={handleRemove} disabled={removing}>
                    {removing ? 'Removing...' : 'Remove'}
                  </PixelButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl sm:rounded-2xl border border-dashed border-white/10 p-6 sm:p-10 text-center">
              <p className="mb-5 text-base text-gray-500">This game is not in your library yet.</p>
              <PixelButton onClick={() => { setAddModalOpen(true); setAddStatus('backlog'); setShareToFeed(false); setCaption(''); }}>
                Add to Library
              </PixelButton>
            </div>
          )}
        </div>
      </div>

      {/* Steam Achievements Section */}
      {profile?.steam_id && achievements?.owns_game && (
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
          <button
            onClick={() => setAchievementsExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left transition hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Inline SVG trophy - symmetric handles */}
              <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none">
                {/* Left handle */}
                <rect x="1" y="6" width="2" height="2" fill="#fbbf24" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="2" y="4" width="2" height="6" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="3" y="5" width="2" height="4" fill="#d97706" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="4" y="3" width="2" height="2" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="4" y="8" width="2" height="2" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                {/* Right handle - exact mirror of left */}
                <rect x="21" y="6" width="2" height="2" fill="#fbbf24" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="20" y="4" width="2" height="6" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="19" y="5" width="2" height="4" fill="#d97706" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="18" y="3" width="2" height="2" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="18" y="8" width="2" height="2" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                {/* Cup bowl - centered between handles */}
                <rect x="6" y="1" width="12" height="2" fill="#fcd34d" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="5" y="3" width="14" height="4" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="6" y="7" width="12" height="4" fill="#d97706" stroke="#1a1a1a" strokeWidth="0.5" />
                {/* Sparkle */}
                <rect x="7" y="2" width="1" height="1" fill="white" />
                {/* Stem - centered under cup (cup x=5-18, center 11.5) */}
                <rect x="11" y="11" width="2" height="4" fill="#b45309" stroke="#1a1a1a" strokeWidth="0.5" />
                {/* Base - same width as cup (x=5, w=14) */}
                <rect x="5" y="15" width="14" height="2" fill="#f59e0b" stroke="#1a1a1a" strokeWidth="0.5" />
                <rect x="4" y="17" width="16" height="4" fill="#d97706" stroke="#1a1a1a" strokeWidth="0.5" />
              </svg>
              <span className="text-sm sm:text-base font-semibold text-gray-200">
                Achievements
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] sm:text-xs font-pixel text-gray-400">
                {achievements.total > 0 ? `${achievements.unlocked_count}/${achievements.total}` : 'No achievements'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {achievements.total > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(achievements.unlocked_count / achievements.total) * 100}%`, backgroundColor: 'var(--color-achievement-orange)' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round((achievements.unlocked_count / achievements.total) * 100)}%
                  </span>
                </div>
              )}
              <svg
                className={`h-4 w-4 text-gray-500 transition ${achievementsExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <AnimatePresence>
            {achievementsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/[0.06] divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
                  {achievements.achievements.map((a) => (
                    <div key={a.apiname} className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${a.achieved ? 'bg-[var(--color-achievement-orange)]/20' : 'bg-white/5'}`}>
                        {(a.achieved ? a.icon : a.icongray) ? (
                          <img
                            src={a.achieved ? a.icon! : a.icongray!}
                            alt=""
                            className="h-10 w-10 object-cover"
                          />
                        ) : a.achieved ? (
                          <svg className="h-5 w-5 text-[var(--color-achievement-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${a.achieved ? 'text-gray-200' : 'text-gray-500'}`}>
                          {a.name}
                        </p>
                        {a.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{a.description}</p>
                        )}
                        {a.achieved && a.unlocktime > 0 && (
                          <p className="mt-1 text-[10px] text-gray-600">
                            Unlocked {new Date(a.unlocktime * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {achievementsLoading && profile?.steam_id && game && (
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-5 w-5 rounded bg-white/5" />
            <div className="h-4 w-32 rounded bg-white/5" />
          </div>
        </div>
      )}

      {!profile?.steam_id && entry && game?.steam_appid && (
        <button
          onClick={() => setSteamConnectOpen(true)}
          className="flex w-full items-center justify-center gap-3 rounded-xl sm:rounded-2xl border border-dashed border-white/10 p-4 sm:p-5 text-sm text-gray-500 transition hover:bg-white/[0.02] hover:text-gray-300 hover:border-white/20"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-3.73 2.56-6.87 6.02-7.75l1.48 2.96c-1.39.44-2.5 1.55-2.94 2.94-.6 1.91.17 3.97 1.84 5.06.78.51 1.68.79 2.6.79 1.08 0 2.1-.39 2.9-1.1l2.1.84c-1.24 2.63-3.89 4.26-6.8 4.26h-.2z" />
          </svg>
          Connect Steam to view achievements
        </button>
      )}

      <SteamConnectModal
        open={steamConnectOpen}
        onClose={() => setSteamConnectOpen(false)}
        onSuccess={() => setAchievementsRefetchTrigger((t) => t + 1)}
      />

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add to Library">
        <div className="space-y-5">
          <p className="text-sm font-medium text-gray-400">Pick a status:</p>
          <StatusSelector
            value={addStatus}
            onChange={setAddStatus}
            variant="compact"
            layout="grid"
            mobileAsDropdown={false}
          />
          <ShareToFeedToggle
            enabled={shareToFeed}
            caption={caption}
            onEnabledChange={setShareToFeed}
            onCaptionChange={setCaption}
          />
          <div className="flex justify-end gap-3 pt-2">
            <PixelButton variant="secondary" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </PixelButton>
            <PixelButton onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding...' : 'Add'}
            </PixelButton>
          </div>
        </div>
      </Modal>

      <Modal open={artworkModalOpen} onClose={() => setArtworkModalOpen(false)} wide bodyScroll={false}>
        <div className="flex shrink-0 items-center justify-between gap-4 mb-4 sm:mb-5">
          <h2 className="font-pixel text-xs sm:text-sm uppercase tracking-[0.12em] text-gray-300">Change Artwork</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={confirmArtwork}
              disabled={savingArtwork}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border-2 border-white/20 bg-blue-600 text-white shadow-[3px_3px_0_0_rgba(20,60,120,0.8)] transition hover:bg-blue-500 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingArtwork ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setArtworkModalOpen(false)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border-2 border-white/20 bg-red-700 text-white shadow-[3px_3px_0_0_rgba(120,20,20,0.8)] transition hover:bg-red-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 sm:flex-row sm:gap-7">
          <div className="shrink-0 flex flex-col items-center sm:items-start">
            <p className="mb-3 font-pixel text-[10px] uppercase tracking-[0.12em] text-gray-500">Selected</p>
            {selectedGridUrl ? (
              <img
                src={selectedGridUrl}
                alt="Selected artwork"
                className="w-40 sm:w-44 rounded-xl object-cover shadow-lg shadow-black/40"
              />
            ) : (
              <div className="flex aspect-[2/3] w-40 sm:w-44 items-center justify-center rounded-xl bg-white/5 text-gray-600 text-sm">
                No image
              </div>
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <p className="mb-3 shrink-0 font-pixel text-[10px] uppercase tracking-[0.12em] text-gray-500">Available</p>
            {gridsLoading ? (
              <div className="grid grid-cols-3 gap-3 sm:gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/5" />
                ))}
              </div>
            ) : grids.length === 0 ? (
              <p className="py-16 text-center text-base text-gray-600">No artwork found on SteamGridDB.</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:max-h-[420px]">
                <div className="grid grid-cols-3 gap-4 sm:gap-3">
                  {grids.map((grid) => {
                    const isSelected = selectedGridUrl === grid.url;
                    return (
                      <button
                        key={grid.id}
                        onClick={() => setSelectedGridUrl(grid.url)}
                        className={`relative overflow-hidden rounded-xl border-2 transition ${
                          isSelected
                            ? 'border-blue-500 ring-1 ring-blue-500/40'
                            : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <img
                          src={grid.thumb || grid.url}
                          alt=""
                          className="aspect-[2/3] w-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
                              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
