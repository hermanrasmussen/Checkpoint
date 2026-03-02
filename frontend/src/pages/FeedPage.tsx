import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PIXEL_BURST_COUNT = 8;
const PIXEL_ANGLES = Array.from({ length: PIXEL_BURST_COUNT }, (_, i) => (i * 360) / PIXEL_BURST_COUNT);
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../components/Toast';
import { getAvatarUrl } from '../components/AvatarSelectModal';
import StatusBadge from '../components/StatusBadge';
import StarRating from '../components/StarRating';
import PixelMagnifier from '../components/PixelMagnifier';
import type { FeedPost, FeedComment, UserProfile } from '../types';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const STATUS_VERB: Record<string, string> = {
  playing: 'is now playing',
  completed: 'completed',
  backlog: 'added to their backlog',
  dropped: 'dropped',
};

function CommentSection({ postId, commentCount: initialCount }: { postId: string; commentCount: number }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<FeedComment[]>(`/feed/${postId}/comments`);
      setComments(data);
      setCount(data.length);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const toggle = () => {
    if (!open) {
      load();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    setOpen((v) => !v);
  };

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const comment = await api.post<FeedComment>(`/feed/${postId}/comments`, { body: body.trim() });
      setComments((prev) => [...prev, comment]);
      setCount((c) => c + 1);
      setBody('');
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/feed/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-xs font-pixel uppercase tracking-[0.12em] text-gray-500 transition hover:text-gray-300 shrink-0"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {count > 0 ? count : 'Comment'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full min-w-0 basis-full sm:basis-auto sm:w-auto"
          >
            <div className="mt-5 min-w-0 space-y-4 border-t border-white/[0.06] pt-5 w-full">
              {loading && (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-white/5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-24 rounded bg-white/5" />
                        <div className="h-4 w-3/4 rounded bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && comments.length === 0 && (
                <p className="text-sm text-gray-600 py-2">No comments yet. Be the first!</p>
              )}

              {!loading && comments.map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  <Link to={`/profile/${c.user_id}`}>
                    <img
                      src={getAvatarUrl(c.avatar_id)}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover object-top border border-white/10"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <Link to={`/profile/${c.user_id}`} className="text-sm font-semibold text-gray-300 hover:text-white transition">
                        {c.username || 'User'}
                      </Link>
                      <span className="text-xs text-gray-600">{timeAgo(c.created_at)}</span>
                      {c.user_id === session?.user?.id && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs text-gray-700 opacity-0 group-hover:opacity-100 transition hover:text-red-400"
                        >
                          delete
                        </button>
                      )}
                    </div>
                    <p className="text-base text-gray-400 break-words">{c.body}</p>
                  </div>
                </div>
              ))}

              <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="flex gap-3 pt-2 min-w-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={500}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-base text-gray-200 placeholder-gray-600 outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
                />
                <button
                  type="submit"
                  disabled={!body.trim() || submitting}
                  className="shrink-0 rounded-lg border-2 border-white/20 bg-white/10 px-4 py-2.5 text-xs font-pixel uppercase tracking-[0.12em] text-gray-300 transition-all hover:bg-white/15 hover:text-white active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-30 disabled:cursor-not-allowed shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]"
                >
                  {submitting ? '...' : 'Post'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function UpvoteButton({
  postId,
  upvotedByMe,
  upvoteCount,
  onUpvoteToggle,
}: {
  postId: string;
  upvotedByMe: boolean;
  upvoteCount: number;
  onUpvoteToggle: (id: string) => void;
}) {
  const prevUpvoted = useRef(upvotedByMe);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (upvotedByMe && !prevUpvoted.current) {
      setShowBurst(true);
      const t = setTimeout(() => setShowBurst(false), 450);
      return () => clearTimeout(t);
    }
    prevUpvoted.current = upvotedByMe;
  }, [upvotedByMe]);

  return (
    <div className="relative inline-flex">
      <motion.button
        onClick={() => onUpvoteToggle(postId)}
        whileTap={{ scale: 0.92 }}
        className={`flex items-center gap-1.5 text-xs font-pixel uppercase tracking-[0.12em] transition ${
          upvotedByMe ? 'text-neon-green' : 'text-gray-500 hover:text-neon-green'
        }`}
      >
        <span className="relative">
          <svg className="h-5 w-5 relative z-10" fill={upvotedByMe ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
          </svg>
          <AnimatePresence>
            {showBurst &&
              PIXEL_ANGLES.map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const dist = 10;
                const x = Math.cos(rad) * dist;
                const y = -Math.sin(rad) * dist;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x,
                      y,
                      scale: 0.5,
                      transition: { duration: 0.35, ease: 'easeOut' },
                    }}
                    exit={{ opacity: 0 }}
                    className="absolute left-1/2 top-1/2 w-1 h-1 -ml-0.5 -mt-0.5 bg-neon-green pointer-events-none"
                  />
                );
              })}
          </AnimatePresence>
        </span>
        {upvoteCount > 0 ? upvoteCount : 'Upvote'}
      </motion.button>
    </div>
  );
}

function FeedCard({
  post,
  onUpvoteToggle,
  onDelete,
  currentUserId,
}: {
  post: FeedPost;
  onUpvoteToggle: (postId: string) => void;
  onDelete: (postId: string) => void;
  currentUserId: string | undefined;
}) {
  const isCollection = post.post_type === 'collection' && post.collection;
  const isOwn = post.user_id === currentUserId;

  const verb = isCollection ? 'shared a collection' : (post.library_entry && STATUS_VERB[post.library_entry.status]) || 'added';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      <div className="p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to={`/profile/${post.user_id}`}>
              <img
                src={getAvatarUrl(post.avatar_id)}
                alt=""
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover object-top border border-white/10 transition hover:border-white/30"
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <Link to={`/profile/${post.user_id}`} className="text-sm sm:text-base font-semibold text-gray-200 hover:text-white transition truncate">
                  {post.username || 'User'}
                </Link>
                <span className="text-sm sm:text-base text-gray-500">{verb}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{timeAgo(post.created_at)}</p>
            </div>
          </div>
          {isOwn && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-gray-700 transition hover:text-red-400 p-1.5"
              title="Delete post"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Content card - collection or game */}
        {isCollection && post.collection ? (
          <Link
            to={`/collection/${post.collection.id}`}
            className="flex gap-4 sm:gap-5 rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5 transition hover:bg-white/[0.05] hover:border-white/10"
          >
            <div className="grid grid-cols-2 grid-rows-2 h-24 w-20 shrink-0 gap-0.5 p-0.5 sm:h-28 sm:w-24 sm:gap-1 md:h-32 md:w-28">
              {post.collection.cover_games.length > 0 ? post.collection.cover_games.slice(0, 4).map((game) => {
                const imageUrl = game.grid_url || game.cover_url;
                return (
                  <div
                    key={game.id}
                    className="overflow-hidden rounded border border-white/20"
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-gray-600 text-xs">?</div>
                    )}
                  </div>
                );
              }) : (
                <div className="col-span-2 row-span-2 flex h-full w-full items-center justify-center rounded bg-white/5 text-gray-600 text-sm">
                  ?
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-100 line-clamp-1">
                {post.collection.name}
              </h3>
              <p className="text-sm text-gray-500">
                {post.collection.game_count} {post.collection.game_count === 1 ? 'game' : 'games'}
              </p>
            </div>
          </Link>
        ) : post.library_entry ? (
          <Link
            to={`/game/${post.library_entry.game.api_id}`}
            className="flex gap-4 sm:gap-5 rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5 transition hover:bg-white/[0.05] hover:border-white/10"
          >
            {(() => {
              const game = post.library_entry.game;
              const coverUrl = game.grid_url || game.cover_url;
              return (
                <>
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={game.title}
                      className="h-24 w-16 sm:h-28 sm:w-20 md:h-32 md:w-24 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-24 w-16 sm:h-28 sm:w-20 md:h-32 md:w-24 shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-600 text-sm">
                      ?
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-100 line-clamp-1">{game.title}</h3>
                    {game.developer && <p className="text-sm text-gray-500">{game.developer}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={post.library_entry.status} size="md" />
                      {post.library_entry.rating != null && (
                        <StarRating value={post.library_entry.rating} readonly size="sm" />
                      )}
                    </div>
                    {game.genre.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {game.genre.slice(0, 3).map((g) => (
                          <span key={g} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-500">{g}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </Link>
        ) : null}

        {/* Caption */}
        {post.caption && (
          <p className="mt-5 text-base text-gray-300 leading-relaxed">{post.caption}</p>
        )}

        {/* Actions - flex-wrap on mobile so expanded comments span full width */}
        <div className="mt-4 sm:mt-5 flex flex-wrap min-w-0 items-start gap-5 sm:gap-6">
          <UpvoteButton
            postId={post.id}
            upvotedByMe={post.upvoted_by_me}
            upvoteCount={post.upvote_count}
            onUpvoteToggle={onUpvoteToggle}
          />
          <CommentSection postId={post.id} commentCount={post.comment_count} />
        </div>
      </div>
    </motion.article>
  );
}

export default function FeedPage() {
  const { session } = useAuth();
  const { confirm, toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [feedFilterOpen, setFeedFilterOpen] = useState(false);
  const feedFilterRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const debouncedUserSearch = useDebounce(userSearchQuery, 300);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (feedFilterRef.current && !feedFilterRef.current.contains(target)) setFeedFilterOpen(false);
      if (searchExpanded && searchContainerRef.current && !searchContainerRef.current.contains(target) &&
        (!searchResultsRef.current || !searchResultsRef.current.contains(target))) {
        setSearchExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchExpanded]);

  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const fetchPosts = useCallback(
    async (offset = 0) => {
      try {
        const params = new URLSearchParams({ offset: String(offset), limit: '20' });
        if (feedFilter === 'following') params.set('filter', 'following');
        const data = await api.get<FeedPost[]>(`/feed?${params}`);
        if (offset === 0) {
          setPosts(data);
        } else {
          setPosts((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 20);
      } catch {
        /* ignore */
      }
    },
    [feedFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchPosts(0).finally(() => setLoading(false));
  }, [fetchPosts]);

  useEffect(() => {
    if (!observerTarget.current || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          fetchPosts(posts.length).finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, posts.length, fetchPosts]);

  useEffect(() => {
    if (debouncedUserSearch.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchLoading(true);
    api
      .get<UserProfile[]>(`/profile/search?q=${encodeURIComponent(debouncedUserSearch)}`)
      .then(setUserSearchResults)
      .catch(() => setUserSearchResults([]))
      .finally(() => setUserSearchLoading(false));
  }, [debouncedUserSearch]);

  const handleUpvoteToggle = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const prevUpvoted = post.upvoted_by_me;
    const prevCount = post.upvote_count;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              upvoted_by_me: !p.upvoted_by_me,
              upvote_count: p.upvoted_by_me ? p.upvote_count - 1 : p.upvote_count + 1,
            }
          : p,
      ),
    );

    try {
      const res = await api.post<{ upvoted: boolean; upvote_count: number }>(`/feed/${postId}/upvote`, {});
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, upvoted_by_me: res.upvoted, upvote_count: res.upvote_count } : p,
        ),
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, upvoted_by_me: prevUpvoted, upvote_count: prevCount } : p,
        ),
      );
      toast.error('Failed to update upvote');
    }
  };

  const handleDelete = async (postId: string) => {
    const ok = await confirm('Delete this post?');
    if (!ok) return;
    try {
      await api.delete(`/feed/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="page-title text-lg sm:text-2xl shrink-0">Feed</h1>
          <div className="flex flex-nowrap items-center gap-2 min-w-0 flex-1 justify-end">
          {/* Everyone/Following dropdown */}
          <div ref={feedFilterRef} className="relative">
            <button
              type="button"
              onClick={() => setFeedFilterOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border-2 border-white/20 px-4 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] text-gray-400 outline-none transition hover:bg-white/[0.04]"
            >
              {feedFilter === 'all' ? 'Everyone' : 'Following'}
              <svg className={`h-2.5 w-2.5 sm:h-3 sm:w-3 transition ${feedFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {feedFilterOpen && (
              <div className="absolute left-0 top-full z-[100] mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#181818] py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => { setFeedFilter('all'); setFeedFilterOpen(false); }}
                  className={`block w-full px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[10px] sm:text-xs font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] transition ${
                    feedFilter === 'all' ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  Everyone
                </button>
                <button
                  type="button"
                  onClick={() => { setFeedFilter('following'); setFeedFilterOpen(false); }}
                  className={`block w-full px-3 py-2 sm:px-4 sm:py-2.5 text-left text-[10px] sm:text-xs font-pixel uppercase tracking-[0.1em] sm:tracking-[0.12em] transition ${
                    feedFilter === 'following' ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  Following
                </button>
              </div>
            )}
          </div>
          {/* Search button - next to filter on both mobile and desktop */}
          <div ref={searchContainerRef} className={`relative flex items-center ${searchExpanded ? 'min-w-[180px] flex-1 sm:min-w-[240px]' : ''}`}>
          {!searchExpanded ? (
            <button
              type="button"
              onClick={() => {
                setSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-500 transition hover:bg-white/[0.07] hover:text-gray-300"
              aria-label="Search users"
            >
              <PixelMagnifier className="h-5 w-5" />
            </button>
          ) : (
            <div className="relative flex-1">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <PixelMagnifier className="h-4 w-4 text-gray-600" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Discover users..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-base text-gray-100 placeholder-gray-600 outline-none transition focus:border-white/20"
                />
              </div>
          )}
          </div>
          </div>
        </div>

        {/* Search results - in flow to push posts down, no scrolling */}
        {searchExpanded && userSearchQuery.trim().length >= 2 && (
          <div ref={searchResultsRef} className="rounded-xl border border-white/10 bg-[#181818] py-2 shadow-xl">
            {userSearchLoading && (
              <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
            )}
            {!userSearchLoading && userSearchResults.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500">No users found</div>
            )}
            {!userSearchLoading &&
              userSearchResults.map((u) => (
                <Link
                  key={u.user_id}
                  to={`/profile/${u.user_id}`}
                  onClick={() => setUserSearchQuery('')}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5"
                >
                  <img
                    src={getAvatarUrl(u.avatar_id)}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover object-top border border-white/10"
                  />
                  <span className="font-medium text-gray-200">{u.username || 'User'}</span>
                </Link>
              ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-white/5" />
                <div className="space-y-2">
                  <div className="h-3 w-32 rounded bg-white/5" />
                  <div className="h-2.5 w-16 rounded bg-white/5" />
                </div>
              </div>
              <div className="flex gap-4 rounded-xl bg-white/[0.03] p-4">
                <div className="h-28 w-20 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-2/3 rounded bg-white/5" />
                  <div className="h-3 w-1/4 rounded bg-white/5" />
                  <div className="h-6 w-20 rounded bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="text-base text-gray-500">The feed is empty.</p>
          <p className="mt-2 text-sm text-gray-600">
            Share a game from your library to get things started!
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            onUpvoteToggle={handleUpvoteToggle}
            onDelete={handleDelete}
            currentUserId={session?.user?.id}
          />
        ))}
      </AnimatePresence>

      <div ref={observerTarget} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
        </div>
      )}

    </div>
  );
}
