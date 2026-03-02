import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Collection } from '../types';

interface CollectionCardProps {
  collection: Collection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const covers = collection.cover_games.slice(0, 4);

  return (
    <Link to={`/collection/${collection.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.04] transition-shadow hover:shadow-xl hover:shadow-black/30"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/5">
          {covers.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-0.5 sm:gap-1 p-1 sm:p-1.5">
              {covers.map((game) => {
                const imageUrl = game.grid_url || game.cover_url;
                return (
                  <div
                    key={game.id}
                    className="overflow-hidden rounded border border-white/20"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={game.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-gray-600">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 18h12a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-semibold leading-snug text-gray-200 line-clamp-2">
            {collection.name}
          </h3>
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] sm:text-xs text-gray-500 font-pixel uppercase tracking-wide sm:tracking-wider whitespace-nowrap">
              {collection.game_count} {collection.game_count === 1 ? 'game' : 'games'}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
