'use client';

import { createClient } from '@/utils/supabase/client';

export default function AuthScreen() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    localStorage.removeItem('matchday_guest');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const continueAsGuest = () => {
    localStorage.setItem('matchday_guest', 'true');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-[#00FF87] flex items-center justify-center shadow-lg shadow-[#00FF87]/20">
          <span className="text-black font-black text-2xl tracking-tighter">MD</span>
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-3xl tracking-tight">Matchday</h1>
          <p className="text-zinc-500 text-sm mt-1">Your football companion</p>
        </div>
      </div>

      {/* Features */}
      <div className="w-full max-w-sm space-y-3 mb-10">
        {[
          { icon: '⚽', label: 'Live scores & fixtures' },
          { icon: '🏆', label: 'Track your club', accountOnly: true },
          { icon: '👥', label: 'Fantasy football with friends', accountOnly: true },
        ].map(({ icon, label, accountOnly }) => (
          <div key={label} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
            <span className="text-xl">{icon}</span>
            <span className="text-zinc-300 text-sm font-medium flex-1">{label}</span>
            {accountOnly && (
              <span className="text-[10px] font-semibold text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">
                Account
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm px-4 py-4 rounded-2xl hover:bg-zinc-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={continueAsGuest}
          className="w-full flex items-center justify-center gap-3 bg-transparent text-zinc-400 font-semibold text-sm px-4 py-4 rounded-2xl border border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 transition-colors"
        >
          Continue as Guest
        </button>

        <p className="text-zinc-600 text-xs text-center">
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}