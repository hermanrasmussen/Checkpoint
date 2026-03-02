import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Collection, LibraryEntry, LibraryStatus } from '../types';
import FilterBar from '../components/FilterBar';
import GameCard from '../components/GameCard';
import CollectionCard from '../components/CollectionCard';
import CollectionModal from '../components/CollectionModal';
import { CardGridSkeleton } from '../components/Skeleton';
import { Link } from 'react-router-dom';

export default function LibraryPage() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LibraryStatus | null>(null);
  const [sort, setSort] = useState('date_added');
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const fetchCollections = useCallback(async () => {
    setCollectionsLoading(true);
    try {
      const data = await api.get<Collection[]>(`/collections`);
      setCollections(data);
    } catch {
      setCollections([]);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('sort', sort);
      const qs = params.toString();
      const data = await api.get<LibraryEntry[]>(`/library?${qs}`);
      setEntries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sort]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 sm:gap-4">
        <h1 className="page-title text-lg sm:text-2xl">My Library</h1>
        <FilterBar
          currentStatus={statusFilter}
          onStatusChange={setStatusFilter}
          currentSort={sort}
          onSortChange={setSort}
          leftContent={
            <div className="flex items-center gap-2">
              <Link
                to="/search"
                className="flex items-center gap-2 rounded-lg border-2 border-white/20 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] text-gray-400 transition-all hover:bg-white/[0.08] hover:text-white active:translate-x-[1px] active:translate-y-[1px] shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]"
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add game
              </Link>
              <button
                onClick={() => setCollectionModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border-2 border-white/20 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] text-gray-400 transition-all hover:bg-white/[0.08] hover:text-white active:translate-x-[1px] active:translate-y-[1px] shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]"
              >
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Collection
              </button>
            </div>
          }
        />
      </div>

      {collections.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="page-title text-base sm:text-xl">Collections</h2>
          {collectionsLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 w-32 shrink-0 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              {collections.map((c) => (
                <div key={c.id} className="w-32 shrink-0 sm:w-36">
                  <CollectionCard collection={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <CardGridSkeleton />}

      {!loading && error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-center">
          <div className="mb-5 rounded-full bg-white/5 p-7">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-300">Your library is empty</h2>
          <p className="mt-2 text-base text-gray-500">
            <Link to="/search" className="text-gray-300 hover:text-white transition underline underline-offset-2">Search for games</Link> to start building your collection.
          </p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <h2 className="page-title text-base sm:text-xl">My Games</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {entries.map((entry) => (
              <GameCard key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}

      <CollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        onSaved={fetchCollections}
      />
    </div>
  );
}
