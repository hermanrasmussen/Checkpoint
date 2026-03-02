import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import type { GameSummary, LibraryStatus } from '../types';
import Modal from '../components/Modal';
import PixelButton from '../components/PixelButton';
import StatusSelector from '../components/StatusSelector';
import ShareToFeedToggle from '../components/ShareToFeedToggle';
import { useToast } from '../components/Toast';
import { Link } from 'react-router-dom';

export default function SearchPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query);
  const [results, setResults] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalGame, setModalGame] = useState<GameSummary | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LibraryStatus>('backlog');
  const [shareToFeed, setShareToFeed] = useState(false);
  const [caption, setCaption] = useState('');
  const [adding, setAdding] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<GameSummary[]>(`/games/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  const handleAdd = async () => {
    if (!modalGame) return;
    setAdding(true);
    try {
      await api.post('/library', {
        api_id: modalGame.api_id,
        status: selectedStatus,
        share_to_feed: shareToFeed,
        caption: shareToFeed && caption.trim() ? caption.trim() : null,
      });
      setAddedIds((prev) => new Set(prev).add(modalGame.api_id));
      setModalGame(null);
      setShareToFeed(false);
      setCaption('');
    } catch (err: any) {
      if (err.message?.includes('Already in library')) {
        setAddedIds((prev) => new Set(prev).add(modalGame.api_id));
        setModalGame(null);
      } else {
        toast.error(err.message || 'Failed to add');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <h1 className="page-title text-lg sm:text-2xl">Search Games</h1>

      <div className="relative">
        <svg className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a game..."
          className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 py-3 sm:py-4 pl-10 sm:pl-12 pr-4 sm:pr-5 text-sm sm:text-base text-gray-100 placeholder-gray-600 outline-none transition focus:border-white/30 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/10"
          autoFocus
        />
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 sm:gap-5 rounded-lg sm:rounded-xl bg-white/[0.03] p-3 sm:p-5">
              <div className="h-20 w-14 shrink-0 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-2/3 rounded bg-white/5" />
                <div className="h-4 w-1/4 rounded bg-white/5" />
              </div>
              <div className="h-10 w-24 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-400">{error}</div>
      )}

      {!loading && !error && debouncedQuery && results.length === 0 && (
        <p className="py-16 text-center text-base text-gray-600">No results for "{debouncedQuery}"</p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-1">
          {results.map((game) => {
            const alreadyAdded = addedIds.has(game.api_id);
            return (
              <div
                key={game.api_id}
                className="flex items-center gap-3 sm:gap-5 rounded-lg sm:rounded-xl p-3 sm:p-4 transition hover:bg-white/[0.04]"
              >
                <Link to={`/game/${game.api_id}`} className="shrink-0">
                  {(game.grid_url || game.cover_url) ? (
                    <img src={game.grid_url || game.cover_url!} alt={game.title} className="h-20 w-14 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-20 w-14 items-center justify-center rounded-lg bg-white/5 text-gray-600 text-sm">?</div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/game/${game.api_id}`} className="text-sm sm:text-base font-semibold text-gray-100 hover:text-white transition line-clamp-1">
                    {game.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    {game.release_year ?? 'Unknown year'}
                    {game.genre.length > 0 && ` · ${game.genre.slice(0, 3).join(', ')}`}
                  </p>
                </div>

                {alreadyAdded ? (
                  <span className="shrink-0 text-sm font-medium text-neon-green">In Library</span>
                ) : (
                  <PixelButton
                    onClick={() => { setModalGame(game); setSelectedStatus('backlog'); setShareToFeed(false); setCaption(''); }}
                    className="shrink-0"
                  >
                    + Add
                  </PixelButton>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modalGame} onClose={() => setModalGame(null)} title="Add to Library">
        {modalGame && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {(modalGame.grid_url || modalGame.cover_url) && (
                <img src={modalGame.grid_url || modalGame.cover_url!} alt={modalGame.title} className="h-24 w-16 rounded-lg object-cover" />
              )}
              <div>
                <p className="text-lg font-semibold text-gray-100">{modalGame.title}</p>
                <p className="text-sm text-gray-500 mt-1">{modalGame.release_year}</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-gray-400">Status</p>
              <StatusSelector
                value={selectedStatus}
                onChange={setSelectedStatus}
                variant="compact"
                layout="grid"
                mobileAsDropdown={false}
              />
            </div>

            <ShareToFeedToggle
              enabled={shareToFeed}
              caption={caption}
              onEnabledChange={setShareToFeed}
              onCaptionChange={setCaption}
            />

            <div className="flex justify-end gap-3 pt-2">
              <PixelButton variant="secondary" type="button" onClick={() => setModalGame(null)}>
                Cancel
              </PixelButton>
              <PixelButton onClick={handleAdd} disabled={adding}>
                {adding ? 'Adding...' : 'Add'}
              </PixelButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
