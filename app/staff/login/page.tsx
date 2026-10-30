'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginStaffAction } from '../actions';

export default function StaffLoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await loginStaffAction(formData);

    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Login failed');
      return;
    }

    if (res.role === 'MASTER_ADMIN') {
      router.push('/admin/orders');
    } else {
      router.push('/staff/branch-floor');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '440px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '18px', padding: '36px 28px', color: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900 }}>
            MKTF
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 6px' }}>Staff & Workshop Login</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Master Admin & Child Workshop Portal
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#fca5a5', marginBottom: '18px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              WORKSHOP EMAIL
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="e.g. kano-branch@mktf.com"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#ffffff', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              PASSWORD
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#ffffff', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ marginTop: '8px', background: '#6366f1', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? 'Verifying...' : 'Sign In to Workshop →'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #334155', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
          New child shop or branch?{' '}
          <Link href="/staff/register" style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}>
            Register branch account
          </Link>
        </div>
      </div>
    </div>
  );
}