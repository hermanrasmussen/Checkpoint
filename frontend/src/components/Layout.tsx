import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import ErrorBoundary from './ErrorBoundary';
import { getAvatarUrl } from './AvatarSelectModal';
import PixelFloppyDisk from './PixelFloppyDisk';
import PixelMagnifier from './PixelMagnifier';

function PixelBooks({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* Book 1 — teal */}
      <rect x="1" y="2" width="3" height="12" fill="#5a8a8a" />
      <rect x="1" y="2" width="1" height="12" fill="#4a7a7a" />
      <rect x="2" y="3" width="1" height="1" fill="#8ababa" />
      {/* Book 2 — warm grey */}
      <rect x="5" y="3" width="3" height="11" fill="#8a8078" />
      <rect x="5" y="3" width="1" height="11" fill="#7a7068" />
      <rect x="6" y="4" width="1" height="1" fill="#b0a898" />
      {/* Book 3 — muted red */}
      <rect x="9" y="1" width="3" height="13" fill="#9a5555" />
      <rect x="9" y="1" width="1" height="13" fill="#884444" />
      <rect x="10" y="2" width="1" height="1" fill="#c07070" />
      {/* Book 4 — slate */}
      <rect x="13" y="3" width="2" height="11" fill="#707088" />
      <rect x="13" y="3" width="1" height="11" fill="#606078" />
      {/* Shelf line */}
      <rect x="0" y="14" width="16" height="2" fill="#444" />
    </svg>
  );
}

function PixelFeed({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* Speech bubble */}
      <rect x="2" y="1" width="10" height="1" fill="#7a9a7a" />
      <rect x="1" y="2" width="1" height="1" fill="#7a9a7a" />
      <rect x="12" y="2" width="1" height="1" fill="#7a9a7a" />
      <rect x="1" y="3" width="11" height="4" fill="#5a8a5a" />
      <rect x="2" y="2" width="10" height="1" fill="#5a8a5a" />
      <rect x="1" y="7" width="12" height="1" fill="#7a9a7a" />
      <rect x="4" y="8" width="1" height="1" fill="#7a9a7a" />
      <rect x="3" y="9" width="1" height="1" fill="#7a9a7a" />
      {/* Text lines */}
      <rect x="3" y="4" width="5" height="1" fill="#b0d0b0" />
      <rect x="3" y="6" width="7" height="1" fill="#90b090" />
      {/* Heart */}
      <rect x="10" y="10" width="2" height="1" fill="#9a5555" />
      <rect x="13" y="10" width="2" height="1" fill="#9a5555" />
      <rect x="9" y="11" width="7" height="1" fill="#9a5555" />
      <rect x="10" y="12" width="5" height="1" fill="#9a5555" />
      <rect x="11" y="13" width="3" height="1" fill="#9a5555" />
      <rect x="12" y="14" width="1" height="1" fill="#9a5555" />
    </svg>
  );
}

function PixelMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* Thick outline - rect frame */}
      <rect x="0" y="0" width="16" height="2" fill="currentColor" />
      <rect x="0" y="14" width="16" height="2" fill="currentColor" />
      <rect x="0" y="2" width="2" height="12" fill="currentColor" />
      <rect x="14" y="2" width="2" height="12" fill="currentColor" />
      {/* Inner fill - subtle gray tone, no yellow */}
      <rect x="2" y="2" width="12" height="12" fill="currentColor" fillOpacity="0.12" />
      {/* Row 1: bullet + line */}
      <rect x="3" y="4" width="2" height="2" fill="currentColor" />
      <rect x="6" y="5" width="6" height="1" fill="currentColor" />
      {/* Row 2 */}
      <rect x="3" y="7" width="2" height="2" fill="currentColor" />
      <rect x="6" y="8" width="6" height="1" fill="currentColor" />
      {/* Row 3 */}
      <rect x="3" y="10" width="2" height="2" fill="currentColor" />
      <rect x="6" y="11" width="6" height="1" fill="currentColor" />
    </svg>
  );
}

function PixelClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* Blocky X - both diagonals meet at center */}
      <rect x="2" y="2" width="2" height="2" fill="currentColor" />
      <rect x="4" y="4" width="2" height="2" fill="currentColor" />
      <rect x="6" y="6" width="2" height="2" fill="currentColor" />
      <rect x="8" y="8" width="2" height="2" fill="currentColor" />
      <rect x="10" y="10" width="2" height="2" fill="currentColor" />
      <rect x="2" y="10" width="2" height="2" fill="currentColor" />
      <rect x="4" y="8" width="2" height="2" fill="currentColor" />
      <rect x="8" y="4" width="2" height="2" fill="currentColor" />
      <rect x="10" y="2" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

const links = [
  { to: '/', label: 'Library', icon: PixelBooks },
  { to: '/search', label: 'Search', icon: PixelMagnifier },
  { to: '/feed', label: 'Feed', icon: PixelFeed },
];

export default function Layout() {
  const { signOut, session } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#181818] text-gray-100">
      <header className="sticky top-0 z-50 bg-[#202020]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 sm:h-[5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 sm:gap-3 select-none">
            <PixelFloppyDisk className="h-9 w-9 sm:h-12 sm:w-12" />
            <span
              className="font-pixel text-sm sm:text-lg text-gray-300 tracking-[0.15em] sm:tracking-[0.2em]"
              style={{ textShadow: '1px 0 0 currentColor, 0 1px 0 currentColor, 1px 1px 0 rgba(0,0,0,0.5)' }}
            >CHECKPOINT</span>
          </NavLink>

          <nav className="hidden sm:flex items-center gap-2">
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-4 py-2 font-pixel text-[10px] uppercase tracking-[0.12em] rounded-lg transition-all ${
                      isActive
                        ? 'text-white bg-white/[0.08]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {l.label}
                </NavLink>
              );
            })}
            <div className="ml-3 flex items-center gap-1 border-l border-white/10 pl-4">
              <NavLink to="/profile" className="flex items-center gap-2.5 rounded-lg px-4 py-2 transition hover:bg-white/[0.04] group">
                <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 transition group-hover:border-white/30">
                  <img
                    src={getAvatarUrl(profile?.avatar_id || 1)}
                    alt="Avatar"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <span className="font-pixel text-[10px] uppercase tracking-[0.12em] text-gray-400 transition group-hover:text-white truncate max-w-[120px]">
                  {profile?.username || session?.user?.email?.split('@')[0]}
                </span>
              </NavLink>
              <button
                onClick={signOut}
                className="flex items-center gap-2.5 rounded-lg px-4 py-2 font-pixel text-[10px] uppercase tracking-[0.12em] text-gray-400 transition hover:text-white hover:bg-white/[0.04] cursor-pointer"
              >
                <img src="/power-icon.png" alt="" className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </nav>

          <button
            className="sm:hidden flex items-center justify-center rounded-lg p-3.5 text-gray-400 transition hover:text-white hover:bg-white/[0.04] active:translate-x-[1px] active:translate-y-[1px]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <PixelClose className="h-6 w-6" />
            ) : (
              <PixelMenu className="h-6 w-6" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/[0.06] sm:hidden"
            >
              <nav className="flex flex-col gap-1 px-4 py-3 sm:px-6 sm:py-4">
                {links.map((l) => {
                  const Icon = l.icon;
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.to === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 font-pixel text-[10px] uppercase tracking-[0.12em] rounded-lg transition ${
                          isActive ? 'text-white bg-white/[0.08]' : 'text-gray-400 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="h-5 w-5" />
                      {l.label}
                    </NavLink>
                  );
                })}
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <NavLink
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 group"
                  >
                    <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10">
                      <img
                        src={getAvatarUrl(profile?.avatar_id || 1)}
                        alt="Avatar"
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <span className="font-pixel text-[10px] uppercase tracking-[0.12em] text-gray-400 truncate group-hover:text-white transition">
                      {profile?.username || session?.user?.email?.split('@')[0]}
                    </span>
                  </NavLink>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex items-center gap-2 font-pixel text-[8px] uppercase tracking-[0.1em] text-gray-500 hover:text-white transition"
                  >
                    <img src="/power-icon.png" alt="" className="h-5 w-5" />
                    Sign out
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
    </div>
  );
}
