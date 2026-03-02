import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import PixelButton from '../components/PixelButton';
import PixelFloppyDisk from '../components/PixelFloppyDisk';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    if (isSignUp && displayName.trim()) {
      const trimmed = displayName.trim();
      if (trimmed.length >= 2 && trimmed.length <= 30) {
        try {
          await api.patch('/profile/me', { username: trimmed });
        } catch (err) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to set display name');
          return;
        }
      }
    }

    setLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#181818] px-4">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <PixelFloppyDisk className="h-14 w-14" />
            <h1
              className="font-pixel text-2xl text-gray-300 tracking-[0.2em]"
              style={{ textShadow: '2px 0 0 currentColor, 0 2px 0 currentColor, 2px 2px 0 rgba(0,0,0,0.5)' }}
            >CHECKPOINT</h1>
          </div>
          <p
            className="font-pixel text-[8px] uppercase tracking-[0.15em] text-gray-500"
            style={{ textShadow: '1px 0 0 currentColor, 0 1px 0 currentColor, 1px 1px 0 rgba(0,0,0,0.4)' }}
          >Track your game library</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition focus:border-white/30 focus:bg-white/[0.07]"
              placeholder="you@example.com"
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-400 mb-2">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                minLength={2}
                maxLength={30}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition focus:border-white/30 focus:bg-white/[0.07]"
                placeholder="How others will see you (optional)"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition focus:border-white/30 focus:bg-white/[0.07]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <PixelButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </PixelButton>
        </form>

        <p className="text-center text-sm text-gray-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <span className="inline-block w-4" aria-hidden />
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setDisplayName(''); }}
            className="text-[10px] font-pixel uppercase tracking-[0.12em] text-gray-300 hover:text-white transition"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
