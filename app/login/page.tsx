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
      router.push(explicitNext);
      router.refresh();
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role;

    if (role === 'admin' || role === 'MASTER_ADMIN') {
      router.push('/admin');
      router.refresh();
      return;
    }

    // Check if the user owns a child shop
    const { data: shop } = await supabase
      .from('child_shops')
      .select('id, status')
      .eq('owner_profile_id', userId)
      .maybeSingle();

    if (shop) {
      if (shop.status === 'active' || role === 'child_shop') {
        router.push('/shop/dashboard');
      } else {
        router.push('/partner/status');
      }
      router.refresh();
      return;
    }

    // Default route for general users
    router.push('/partner/apply');
    router.refresh();
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
      }
    }

    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '2px solid #cbd5e1',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#0f172a',
          border: '1.5px solid #1e293b',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '2.5rem' }}>🪡</span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', margin: '8px 0 4px' }}>
            {mode === 'signin' ? 'Sign In to Workshop' : 'Join Workshop Network'}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            {mode === 'signin'
              ? 'Access your child shop dashboard or admin atelier'
              : 'Register your branch atelier to process bespoke orders'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {needsConfirmation ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              color: '#fbbf24',
              fontSize: '0.9rem',
              lineHeight: '1.5',
            }}
          >
            A confirmation link was sent to <strong>{registeredEmail}</strong>. Please check your inbox to activate your account.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  FULL NAME / WORKSHOP LEAD
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ibrahim Abubakar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                placeholder="tailor@workshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                PASSWORD
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '13px',
                backgroundColor: '#f59e0b',
                color: '#090d16',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? 'Processing...' : mode === 'signin' ? 'Sign In →' : 'Register Account →'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {mode === 'signin'
              ? "Don't have an account? Apply to become a child workshop"
              : 'Already have an approved account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
