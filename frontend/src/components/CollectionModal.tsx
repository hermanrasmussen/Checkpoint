import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { CollectionDetail, LibraryEntry } from '../types';
import Modal from './Modal';
import PixelButton from './PixelButton';
import { useDebounce } from '../hooks/useDebounce';

interface CollectionModalProps {
  open: boolean;
  onClose: () => void;
  collection?: CollectionDetail | null;
  onSaved: () => void;
}

export default function CollectionModal({
  open,
  onClose,
  collection,
  onSaved,
}: CollectionModalProps) {
  const isEdit = !!collection;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedApiIds, setSelectedApiIds] = useState<Set<string>>(new Set());
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 200);

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const data = await api.get<LibraryEntry[]>(`/library?sort=title&limit=200`);
      setLibraryEntries(data);
    } catch {
      setLibraryEntries([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setName(collection?.name ?? '');
      setDescription(collection?.description ?? '');
      setSelectedApiIds(new Set(collection?.games.map((g) => g.api_id) ?? []));
      setSearchQuery('');
      setError(null);
      if (isEdit) {
        setLibraryEntries([]);
      } else {
        fetchLibrary();
      }
    }
  }, [open, isEdit, collection, fetchLibrary]);

  useEffect(() => {
    if (open && isEdit) {
      fetchLibrary();
    }
  }, [open, isEdit, fetchLibrary]);

  const filteredEntries = debouncedSearch.trim()
    ? libraryEntries.filter((e) =>
        e.game.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : libraryEntries;

  const selectedEntries = libraryEntries.filter((e) =>
    selectedApiIds.has(e.game.api_id)
  );
  const selectedOrdered = useMemo(() => {
    const fromCollection = (collection?.games ?? []).filter((g) =>
      selectedApiIds.has(g.api_id)
    );
    const fromLibrary = selectedEntries
      .map((e) => e.game)
      .filter((g) => !fromCollection.some((c) => c.api_id === g.api_id));
    return [...fromCollection, ...fromLibrary];
  }, [collection?.games, selectedApiIds, selectedEntries]);

  const handleToggleGame = (apiId: string) => {
    setSelectedApiIds((prev) => {
      const next = new Set(prev);
      if (next.has(apiId)) {
        next.delete(apiId);
      } else {
        next.add(apiId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit && collection) {
        await api.patch(`/collections/${collection.id}`, {
          name: trimmedName,
          description: description.trim() || null,
        });

        const originalIds = new Set(collection.games.map((g) => g.api_id));
        const toAdd = [...selectedApiIds].filter((id) => !originalIds.has(id));
        const toRemove = [...originalIds].filter((id) => !selectedApiIds.has(id));

        for (const apiId of toAdd) {
          await api.post(`/collections/${collection.id}/games`, { api_id: apiId });
        }
        for (const apiId of toRemove) {
          await api.delete(`/collections/${collection.id}/games/${apiId}`);
        }
      } else {
        await api.post('/collections', {
          name: trimmedName,
          description: description.trim() || null,
          game_ids: [...selectedApiIds],
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Collection' : 'New Collection'}
      wide
    >
      <div className="space-y-4 sm:space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-500">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zelda Series"
            maxLength={100}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base text-gray-200 placeholder-gray-600 outline-none transition focus:border-white/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-500">
            Description <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. My favorite Zelda games"
            maxLength={500}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base text-gray-200 placeholder-gray-600 outline-none transition focus:border-white/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-500">
            Games
          </label>
          <p className="mb-2 text-xs text-gray-600">
            Select games from your library to add to this collection.
          </p>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your library..."
            className="mb-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none transition focus:border-white/20"
          />

          {selectedOrdered.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedOrdered.map((game) => {
                const imageUrl = game.grid_url || game.cover_url;
                return (
                  <div
                    key={game.api_id}
                    className="group relative flex h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={game.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-600 text-xs">
                        ?
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleGame(game.api_id)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <span className="text-[10px]">×</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
            {libraryLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Loading library...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No games in your library.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEntries.map((entry) => {
                  const imageUrl = entry.game.grid_url || entry.game.cover_url;
                  const isSelected = selectedApiIds.has(entry.game.api_id);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleToggleGame(entry.game.api_id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition ${
                        isSelected
                          ? 'bg-neon-green/10 border border-neon-green/30'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-white/5">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-600 text-xs">
                            ?
                          </div>
                        )}
                      </div>
                      <span className="flex-1 truncate text-sm text-gray-200">
                        {entry.game.title}
                      </span>
                      {isSelected && (
                        <span className="text-neon-green text-xs">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <PixelButton variant="secondary" type="button" onClick={onClose}>
            Cancel
          </PixelButton>
          <PixelButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </PixelButton>
        </div>
      </div>
    </Modal>
  );
}
