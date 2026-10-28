'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLinksPage() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const universalOrderUrl = `${siteUrl}/order`;
  const whatsappTemplate = `Salam! Great choice. To select your sewing style, embroidery design, and enter your measurements, please click here: ${universalOrderUrl}`;

  const copyToClipboard = async (text: string, type: 'link' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedMsg(true);
        setTimeout(() => setCopiedMsg(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '32px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        
        {/* Navigation */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/orders" style={{ fontSize: 13, color: '#176b4d', fontWeight: 700, textDecoration: 'none' }}>
            ← Back to Orders Dashboard
          </Link>
          <h1 style={{ margin: '12px 0 4px', fontSize: 24, color: '#111827', fontWeight: 800 }}>
            Universal WhatsApp Order Link
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Use this single link for all customers who DM you from the WhatsApp showroom group.
          </p>
        </div>

        {/* Universal Link Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'grid', gap: 20 }}>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
              Direct Order Link
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={universalOrderUrl}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', fontSize: 14, fontFamily: 'monospace' }}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(universalOrderUrl, 'link')}
                style={{
                  padding: '10px 16px',
                  background: copiedLink ? '#176b4d' : '#f3f4f6',
                  color: copiedLink ? '#fff' : '#111827',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? '✓ Copied' : 'Copy Link 🔗'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>
              WhatsApp Auto-Reply Message
            </label>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, fontSize: 14, color: '#166534', lineHeight: 1.5, marginBottom: 10 }}>
              {whatsappTemplate}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(whatsappTemplate, 'msg')}
              style={{
                width: '100%',
                padding: '12px',
                background: copiedMsg ? '#176b4d' : '#25d366',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              {copiedMsg ? '✓ Copied Message!' : 'Copy WhatsApp DM Message 💬'}
            </button>
          </div>

        </div>

        {/* How to use */}
        <div style={{ marginTop: 20, background: '#fff', border: '1px dashed #d1d5db', borderRadius: 12, padding: 16, fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
          <strong style={{ color: '#111827', display: 'block', marginBottom: 4 }}>How to set up on your phone:</strong>
          Open <strong>WhatsApp Business</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Business Tools</strong> &rarr; <strong>Quick Replies</strong>.
          <br />
          Set shortcut to <code>/order</code> and paste the message above. Whenever any customer DMs you a photo from your group, type <code>/order</code> and tap send!
        </div>

      </div>
    </main>
  );
}
