'use client';

import { FormEvent, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get('next');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  async function routeUserByRole(supabase: any, userId: string) {
    if (explicitNext) {
      window.location.href = explicitNext;
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const role = (profile?.role || '').toLowerCase();

      if (role === 'admin' || role === 'master_admin') {
        window.location.href = '/admin';
        return;
      }

      const { data: shop } = await supabase
        .from('child_shops')
        .select('id, status')
        .eq('owner_profile_id', userId)
        .maybeSingle();

      if (shop) {
        if (shop.status === 'active' || role === 'child_shop') {
          window.location.href = '/shop/dashboard';
        } else {
          window.location.href = '/partner/status';
        }
        return;
      }

      window.location.href = '/staff/branch-floor';
    } catch {
      window.location.href = '/admin';
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    if (mode === 'signup') {
      const redirectDestination =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/partner/apply`
          : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectDestination,
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data?.user && (!data.session || data.user.identities?.length === 0)) {
        setRegisteredEmail(email);
        setNeedsConfirmation(true);
        setLoading(false);
        return;
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim() || 'New Tailor Partner',
          email: data.user.email,
          role: 'customer',
          is_active: true,
        });
        await routeUserByRole(supabase, data.user.id);
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        await routeUserByRole(supabase, data.user.id);
      } else {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl mb-3">
            🪡
          </div>
          <h1 className="text-2xl font-black text-white">Sign In to Workshop</h1>
          <p className="text-xs text-slate-400 mt-1">Access your child shop dashboard or admin atelier</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-semibold text-center">
            {error}
          </div>
        )}

        {needsConfirmation ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 text-center space-y-2">
            <p className="font-bold">Check your email!</p>
            <p>We sent a confirmation link to <span className="font-mono text-white">{registeredEmail}</span>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400"
                  placeholder="Master Artisan"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400"
                placeholder="name@mktf.com"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="text-xs text-amber-400/80 hover:text-amber-300 font-semibold"
          >
            {mode === 'signin'
              ? "Don't have an account? Apply to become a child workshop"
              : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
