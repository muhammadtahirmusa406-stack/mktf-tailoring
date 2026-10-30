'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/partner/apply';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    const supabase = createClient();

    if (mode === 'signup') {
      const redirectDestination = typeof window !== 'undefined'
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

      // Check if email confirmation is required by Supabase
      if (data?.user && (!data.session || data.user.identities?.length === 0)) {
        setRegisteredEmail(email);
        setNeedsConfirmation(true);
        setLoading(false);
        return;
      }

      // If Supabase has email confirmation disabled, user session is immediate
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim() || 'New Tailor Partner',
          email: data.user.email,
          role: 'customer',
          is_active: true,
        });
      }

      router.push(nextUrl);
      router.refresh();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(nextUrl);
      router.refresh();
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
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        }}
      >
        {needsConfirmation ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📬</div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 10px', color: '#0f172a' }}>
              Check your inbox!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 20px' }}>
              We sent a verification link to <br />
              <strong style={{ color: '#0f172a' }}>{registeredEmail}</strong>.
            </p>

            <div
              style={{
                background: '#dcfce7',
                border: '1px solid #86efac',
                padding: '16px',
                borderRadius: '10px',
                color: '#14532d',
                fontSize: '0.86rem',
                lineHeight: 1.5,
                textAlign: 'left',
                marginBottom: '24px',
              }}
            >
              ✓ <strong>Next Step:</strong> Click the confirmation link in that email to activate your account. You will automatically land on the <strong>Workshop Application Form</strong> to submit your branch details.
            </div>

            <button
              type="button"
              onClick={() => {
                setNeedsConfirmation(false);
                setMode('signin');
              }}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Toggle Tabs */}
            <div
              style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                marginBottom: '24px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  background: mode === 'signin' ? '#0f172a' : 'transparent',
                  color: mode === 'signin' ? '#ffffff' : '#64748b',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  background: mode === 'signup' ? '#0f172a' : 'transparent',
                  color: mode === 'signup' ? '#ffffff' : '#64748b',
                }}
              >
                Create Account
              </button>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
              {mode === 'signin' ? 'Sign in to Workshop' : 'Join Tailoring Network'}
            </h1>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.88rem' }}>
              {mode === 'signin'
                ? 'Sign in to access assigned jobs and cutting specs.'
                : 'Create an account to apply as an authorized workshop branch.'}
            </p>

            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '18px',
                }}
              >
                ✕ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ibrahim Abubakar"
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tailor@example.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In →' : 'Continue to Application →'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
