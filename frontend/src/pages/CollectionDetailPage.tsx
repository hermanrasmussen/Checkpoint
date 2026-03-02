import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import type { CollectionDetail } from '../types';
import CollectionModal from '../components/CollectionModal';
import PixelButton from '../components/PixelButton';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast, confirm } = useToast();

  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentUserId = session?.user?.id;
  const isOwnCollection = collection?.user_id && currentUserId && collection.user_id === currentUserId;

  const fetchCollection = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CollectionDetail>(`/collections/${collectionId}`);
      setCollection(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleShareToFeed = async () => {
    if (!collection) return;
    setSharing(true);
    try {
      await api.post(`/collections/${collection.id}/share`, {});
      setShared(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to share';
      if (msg.includes('already shared')) {
        setShared(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!collection) return;
    const ok = await confirm('Delete this collection? The games in your library will not be affected.');
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/collections/${collection.id}`);
      toast.success('Collection deleted');
      navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-white/5" />
        <div className="h-4 w-3/4 rounded-lg bg-white/5" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <p className="text-red-400 text-base">{error || 'Collection not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-gray-400 hover:text-white text-sm transition"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 sm:space-y-8"
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="grid grid-cols-2 grid-rows-2 h-32 w-24 shrink-0 gap-0.5 p-0.5 sm:h-40 sm:w-28 sm:gap-1">
            {collection.cover_games.length > 0 ? (
              collection.cover_games.slice(0, 4).map((game) => {
                const imageUrl = game.grid_url || game.cover_url;
                return (
                  <div
                    key={game.id}
                    className="overflow-hidden rounded border border-white/20"
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-gray-600 text-xs">?</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 row-span-2 flex h-full w-full items-center justify-center rounded bg-white/5 text-gray-600">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{collection.name}</h1>
              {!isOwnCollection && collection.username && (
                <span className="text-sm text-gray-500">by {collection.username}</span>
              )}
            </div>
            {collection.description && (
              <p className="mt-2 text-base text-gray-400">{collection.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {collection.game_count} {collection.game_count === 1 ? 'game' : 'games'}
            </p>
          </div>
        </div>

        {isOwnCollection && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border-2 border-white/20 px-3 py-2 sm:px-4 sm:py-2.5 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] transition-all active:translate-x-[1px] active:translate-y-[1px] bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.04]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleShareToFeed}
              disabled={sharing || shared || collection.game_count === 0}
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
            <PixelButton variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </PixelButton>
          </div>
        )}
      </div>

      {collection.games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-gray-500">This collection is empty.</p>
          {isOwnCollection && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="mt-3 text-sm text-gray-400 hover:text-white transition underline"
            >
              Add games
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {collection.games.map((game) => (
            <Link key={game.id} to={`/game/${game.api_id}`} className="block">
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/[0.04] transition-shadow hover:shadow-xl hover:shadow-black/30"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-white/5">
                  {(game.grid_url || game.cover_url) ? (
                    <img
                      src={game.grid_url || game.cover_url!}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-600">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 18h12a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold leading-snug text-gray-200 line-clamp-2">
                    {game.title}
                  </h3>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {isOwnCollection && (
        <CollectionModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          collection={collection}
          onSaved={() => {
            fetchCollection();
            setEditModalOpen(false);
          }}
        />
      )}
    </motion.div>
  );
}
