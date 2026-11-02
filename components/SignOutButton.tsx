'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900/40 text-xs font-bold transition cursor-pointer ${className}`}
    >
      <span>🚪</span>
      <span>Sign Out of Atelier</span>
    </button>
  );
}
