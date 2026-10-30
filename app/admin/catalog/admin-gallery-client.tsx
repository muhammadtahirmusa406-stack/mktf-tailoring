'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface SewingStyle {
  id: string;
  name: string;
  sewing_charge?: number | null;
  base_price?: number | null;
  image_url?: string | null;
  description?: string | null;
}

interface EmbroideryDesign {
  id: string;
  name: string;
  code?: string | null;
  price?: number | null;
  image_url?: string | null;
  category?: string | null;
  category_name?: string | null;
}

interface Props {
  initialStyles: SewingStyle[];
  initialDesigns: EmbroideryDesign[];
}

export default function AdminGalleryClient({ initialStyles = [], initialDesigns = [] }: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'styles' | 'designs'>('all');

  return (
    <div style={{ marginTop: '48px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'all' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'all' ? '#fff' : '#64748b'
          }}
        >
          All Items ({initialStyles.length + initialDesigns.length})
        </button>
        <button
          onClick={() => setActiveTab('styles')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'styles' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'styles' ? '#fff' : '#64748b'
          }}
        >
          Sewing Styles ({initialStyles.length})
        </button>
        <button
          onClick={() => setActiveTab('designs')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'designs' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'designs' ? '#fff' : '#64748b'
          }}
        >
          Embroidery Artwork ({initialDesigns.length})
        </button>
      </div>

      {/* Grid Display */}
      {(activeTab === 'all' || activeTab === 'styles') && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
            Sewing Styles & Silhouettes
          </h2>
          {initialStyles.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No sewing styles found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {initialStyles.map((item) => (
                <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '100%', height: '220px', position: 'relative', background: '#f8fafc' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No Image</div>
                    )}
                  </div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{item.name}</div>
                    <div style={{ color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
                      Sewing: ₦{Number(item.sewing_charge || item.base_price || 0).toLocaleString()}
                    </div>
                    {item.description && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '6px 0 0' }}>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(activeTab === 'all' || activeTab === 'designs') && (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
            Embroidery Designs & Artwork
          </h2>
          {initialDesigns.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No embroidery designs found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {initialDesigns.map((item) => (
                <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: '100%', height: '200px', position: 'relative', background: '#f8fafc' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No Image</div>
                    )}
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.code || item.name}</span>
                      <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                        {item.category || item.category_name || 'Embroidery'}
                      </span>
                    </div>
                    <div style={{ color: '#6366f1', fontWeight: 700, marginTop: '4px', fontSize: '0.95rem' }}>
                      ₦{Number(item.price || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}