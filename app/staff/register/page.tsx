'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerChildShopAction } from '../actions';

export default function StaffRegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await registerChildShopAction(formData);

    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed');
      return;
    }

    setSuccessMsg('Branch registered! Redirecting to login...');
    setTimeout(() => {
      router.push('/staff/login');
    }, 1500);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '18px', padding: '36px 28px', color: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            CHILD SHOP & ARTISAN ONBOARDING
          </span>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '6px 0' }}>Register Branch Account</h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            Connect your branch or workshop floor to MKTF Tailoring.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#fca5a5', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#86efac', marginBottom: '16px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              BRANCH / SHOP NAME *
            </label>
            <input
              name="branchName"
              required
              placeholder="e.g. Kano Embroidery Hub or Dutse Sewing Unit"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              CONTACT PERSON / TAILOR NAME *
            </label>
            <input
              name="fullName"
              required
              placeholder="e.g. Malam Aminu"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              LOGIN EMAIL *
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="e.g. branch.kano@mktf.com"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              PASSWORD *
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
              MKTF MASTER ACCESS KEY * (Ask Admin)
            </label>
            <input
              name="secretCode"
              required
              placeholder="Enter workshop secret code"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #f59e0b', background: '#0f172a', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
              Default Code: <code>@MKTF2026</code>
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ marginTop: '8px', background: '#16a34a', color: '#ffffff', border: 'none', padding: '13px', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? 'Creating Account...' : 'Complete Branch Registration →'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
          Already registered?{' '}
          <Link href="/staff/login" style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
