import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../components/Toast';
import type { Collection, LibraryEntry, LibraryStatus, PublicProfile, UserProfile } from '../types';
import FilterBar from '../components/FilterBar';
import GameCard from '../components/GameCard';
import CollectionCard from '../components/CollectionCard';
import { CardGridSkeleton } from '../components/Skeleton';
import AvatarSelectModal, { getAvatarUrl } from '../components/AvatarSelectModal';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { session } = useAuth();
  const { updateProfile } = useProfile();
  const { toast } = useToast();
  const currentUserId = session?.user?.id;
  const isOwnProfile = !userId || userId === currentUserId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowedByMe, setIsFollowedByMe] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LibraryStatus | null>(null);
  const [sort, setSort] = useState('date_added');

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isOwnProfile) {
        const [prof, lib, colls] = await Promise.all([
          api.get<UserProfile>('/profile/me'),
          api.get<LibraryEntry[]>(`/library?sort=${sort}${statusFilter ? `&status=${statusFilter}` : ''}`),
          api.get<Collection[]>('/collections'),
        ]);
        setProfile(prof);
        setEntries(lib);
        setCollections(colls ?? []);
        setFollowerCount(0);
        setFollowingCount(0);
        setIsFollowedByMe(false);
      } else {
        const params = new URLSearchParams({ sort });
        if (statusFilter) params.set('status', statusFilter);
        const pub = await api.get<PublicProfile>(`/profile/${userId}?${params}`);
        setProfile({ user_id: pub.user_id, username: pub.username, avatar_id: pub.avatar_id });
        setEntries(pub.library);
        setCollections(pub.collections ?? []);
        setFollowerCount(pub.follower_count);
        setFollowingCount(pub.following_count);
        setIsFollowedByMe(pub.is_followed_by_me);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, userId, statusFilter, sort]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarSelect = async (avatarId: number) => {
    setSavingAvatar(true);
    try {
      const updated = await api.patch<UserProfile>('/profile/me', { avatar_id: avatarId });
      setProfile(updated);
      updateProfile(updated);
      toast.success('Avatar updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update avatar');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleUsernameSave = async () => {
    setUsernameError(null);
    const trimmed = usernameInput.trim();
    if (trimmed.length < 2) {
      setUsernameError('Must be at least 2 characters');
      return;
    }
    setSavingUsername(true);
    try {
      const updated = await api.patch<UserProfile>('/profile/me', { username: trimmed });
      setProfile(updated);
      updateProfile(updated);
      setEditingUsername(false);
      toast.success('Username updated');
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  const startEditUsername = () => {
    setUsernameInput(profile?.username || '');
    setUsernameError(null);
    setEditingUsername(true);
  };

  const handleFollowToggle = async () => {
    if (!userId) return;
    setFollowLoading(true);
    try {
      const res = await api.post<{ following: boolean }>(`/profile/${userId}/follow`, {});
      setIsFollowedByMe(res.following);
      setFollowerCount((c) => (res.following ? c + 1 : c - 1));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 sm:h-28 sm:w-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
          </div>
        </div>
        <CardGridSkeleton />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-sm text-red-400">
        {error}
      </div>
    );
  }

  const displayName = profile?.username || (isOwnProfile ? session?.user?.email : 'Unknown Player');

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-row items-start gap-4 sm:gap-6">
        <div className="relative group shrink-0">
          <motion.div
            whileHover={isOwnProfile ? { scale: 1.05 } : undefined}
            className={`h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-xl sm:rounded-2xl border-2 border-white/[0.08] bg-white/5 ${
              isOwnProfile ? 'cursor-pointer' : ''
            }`}
            onClick={isOwnProfile ? () => setAvatarModalOpen(true) : undefined}
          >
            <img
              src={getAvatarUrl(profile?.avatar_id || 1)}
              alt="Avatar"
              className="h-full w-full object-cover object-top"
            />
            {isOwnProfile && !savingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            )}
            {savingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          {editingUsername ? (
            <div className="flex flex-col gap-1.5 max-h-[5rem] sm:max-h-[6rem]">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUsernameSave()}
                maxLength={30}
                autoFocus
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-pixel text-xs sm:text-sm uppercase tracking-[0.12em] text-white outline-none focus:border-white/30 w-full max-w-xs h-8"
                placeholder="Username"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUsernameSave}
                  disabled={savingUsername}
                  className="rounded-lg border-2 border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-pixel uppercase tracking-[0.12em] text-white transition-all hover:bg-white/20 active:translate-x-[1px] active:translate-y-[1px] shadow-[3px_3px_0_0_rgba(0,0,0,0.3)] disabled:opacity-50"
                >
                  {savingUsername ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingUsername(false)}
                  disabled={savingUsername}
                  className="rounded-lg border-2 border-white/20 px-3 py-1.5 text-[10px] font-pixel uppercase tracking-[0.12em] text-gray-500 transition-all hover:text-white hover:bg-white/[0.04] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="m-0 font-pixel text-xs sm:text-base leading-tight uppercase tracking-[0.12em] text-gray-300 truncate">
                  {displayName}
                </h1>
                {isOwnProfile && (
                  <button
                    onClick={startEditUsername}
                    className="text-gray-500 transition hover:text-white shrink-0"
                    title="Edit username"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="m-0 font-pixel text-[10px] sm:text-sm leading-tight uppercase tracking-[0.12em] text-gray-500">
                {entries.length} {entries.length === 1 ? 'game' : 'games'} in library
              </p>
              {!isOwnProfile ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-pixel text-[10px] sm:text-sm uppercase tracking-[0.12em] text-gray-500">
                    {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                  </span>
                  <span className="font-pixel text-[10px] sm:text-sm uppercase tracking-[0.12em] text-gray-500">
                    {followingCount} following
                  </span>
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`rounded-lg border-2 px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] font-pixel uppercase tracking-[0.12em] transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 ${
                      isFollowedByMe
                        ? 'border-white/20 bg-white/5 text-gray-400 hover:border-white/30 hover:text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]'
                        : 'border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20 shadow-[3px_3px_0_0_rgba(0,100,80,0.3)]'
                    }`}
                  >
                    {followLoading ? '...' : isFollowedByMe ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              ) : null}
            </>
          )}
          {usernameError && (
            <p className="mt-1 text-xs text-red-400">{usernameError}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 sm:gap-4">
        <h2 className="page-title text-sm sm:text-xl">
          {isOwnProfile ? 'My Library' : 'Library'}
        </h2>
        <FilterBar
          currentStatus={statusFilter}
          onStatusChange={setStatusFilter}
          currentSort={sort}
          onSortChange={setSort}
        />
      </div>

      {collections.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="page-title text-base sm:text-xl">Collections</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {collections.map((c) => (
              <div key={c.id} className="w-32 shrink-0 sm:w-36">
                <CollectionCard collection={c} />
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <CardGridSkeleton />}

      {!loading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-white/5 p-6">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-base text-gray-500">
            {isOwnProfile ? 'Your library is empty.' : 'This library is empty.'}
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((entry) => (
            <GameCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {isOwnProfile && (
        <AvatarSelectModal
          open={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatarId={profile?.avatar_id || 1}
          onSelect={handleAvatarSelect}
        />
      )}
    </div>
  );
}
