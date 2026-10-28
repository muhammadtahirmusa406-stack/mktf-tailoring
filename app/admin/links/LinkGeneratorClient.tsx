'use client';

import { useState } from 'react';

type FabricItem = {
  id: string;
  name: string;
  fabric_reference: string;
  base_price_per_yard: number | null;
};

type Props = {
  fabrics: FabricItem[];
  siteUrl: string;
};

export default function LinkGeneratorClient({ fabrics, siteUrl }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getOrderUrl = (fabricRef: string) => `${siteUrl}/order?fabric=${fabricRef}`;

  const getTemplateText = (fabricRef: string) => {
    return `Great choice! To select your embroidery, sewing style, and submit your measurements, click here: ${getOrderUrl(fabricRef)}`;
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  if (!fabrics || fabrics.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 32, textAlign: 'center', color: '#6b7280' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#374151' }}>
          No fabrics found in the database.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14 }}>
          Please make sure the <code>fabrics</code> table has data and public SELECT permissions are enabled in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 800 }}>
              WhatsApp DM Quick-Reply Links
            </h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              When a customer DMs you a photo from your group, send them the link for that fabric type.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {fabrics.map((f) => {
            const rawUrl = getOrderUrl(f.fabric_reference);
            const messageText = getTemplateText(f.fabric_reference);
            const isCopiedMessage = copiedId === `msg-${f.id}`;
            const isCopiedLink = copiedId === `url-${f.id}`;
            const price = Number(f.base_price_per_yard ?? 0);

            return (
              <div
                key={f.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 16,
                  background: '#fcfdfc',
                  display: 'grid',
                  gap: 12,
                }}
              >
                {/* Title & Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 16, color: '#111827' }}>{f.name}</strong>
                    <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, background: '#e5e7eb', fontSize: 12, fontFamily: 'monospace' }}>
                      {f.fabric_reference}
                    </span>
                  </div>
                  <strong style={{ color: '#176b4d', fontSize: 15 }}>
                    ₦{price.toLocaleString('en-NG')}/yd
                  </strong>
                </div>

                {/* Visible Order Link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260, background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace', color: '#1f2937', wordBreak: 'break-all' }}>
                    {rawUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(`url-${f.id}`, rawUrl)}
                    style={{
                      padding: '8px 14px',
                      background: isCopiedLink ? '#176b4d' : '#f3f4f6',
                      color: isCopiedLink ? '#fff' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isCopiedLink ? '✓ Copied URL' : 'Copy URL 🔗'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(`msg-${f.id}`, messageText)}
                    style={{
                      padding: '8px 16px',
                      background: isCopiedMessage ? '#176b4d' : '#25d366',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isCopiedMessage ? '✓ Copied WhatsApp Message' : 'Copy Full WhatsApp Message 💬'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
