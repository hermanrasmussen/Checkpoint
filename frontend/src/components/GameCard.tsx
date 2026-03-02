import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { LibraryEntry } from '../types';
import StatusBadge from './StatusBadge';
import StarRating from './StarRating';

interface GameCardProps {
  entry: LibraryEntry;
}

export default function GameCard({ entry }: GameCardProps) {
  const { game, status, rating } = entry;
  const imageUrl = game.grid_url || game.cover_url;

  return (
    <Link to={`/game/${game.api_id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/[0.04] transition-shadow hover:shadow-xl hover:shadow-black/30"
      >
        <div className="aspect-[3/4] w-full overflow-hidden bg-white/5">
          {imageUrl ? (
            <img
              src={imageUrl}
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
          {game.release_year && (
            <p className="text-sm text-gray-500">{game.release_year}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 min-w-0">
            <StatusBadge status={status} />
            {rating !== null && (
              <span className="scale-90 origin-left sm:scale-100">
                <StarRating value={rating} readonly size="sm" />
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
