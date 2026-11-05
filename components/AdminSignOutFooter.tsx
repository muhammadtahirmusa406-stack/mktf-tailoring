'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';

export default function AdminSignOutFooter() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur py-6 px-4 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Master Atelier Active Session</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-400">Authenticated as Administrator</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing out...' : '🚪 End Admin Session'}
          </button>
        </div>
      </div>
    </footer>
  );
}
