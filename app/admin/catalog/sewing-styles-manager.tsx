'use client';

import React, { useState } from 'react';
import { uploadSewingStyleAction, deleteSewingStyleAction } from './actions';

export default function SewingStylesManager({ initialStyles }: { initialStyles: any[] }) {
  const [styles, setStyles] = useState(initialStyles);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDelete = async (styleId: string, styleName: string) => {
    if (!confirm(`Permanently delete "${styleName}" from your catalog?`)) return;

    setDeletingId(styleId);
    const formData = new FormData();
    formData.append('styleId', styleId);

    const res = await deleteSewingStyleAction(formData);
    setDeletingId(null);

    if (res && !res.success) {
      alert('Delete failed: ' + res.error);
    } else {
      // Instantly remove card from screen
      setStyles((prev) => prev.filter((s) => s.id !== styleId));
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '36px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.5rem' }}>✂️</span>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Upload Sewing Cut / Style (Baban Riga, Kaftan, etc.)
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Add your real outfit photos and configure your tailoring sewing charges.
          </span>
        </div>
      </div>

      <form
        action={async (formData) => {
          setIsUploading(true);
          try {
            await uploadSewingStyleAction(formData);
          } catch (err: any) {
            alert(err.message || 'Upload failed');
          } finally {
            setIsUploading(false);
          }
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Style Name
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Baban Riga, Kaftan"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Sewing Charge (₦)
          </label>
          <input
            type="number"
            name="basePrice"
            required
            step="500"
            placeholder="e.g. 35000"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Short Description
          </label>
          <input
            type="text"
            name="description"
            placeholder="e.g. Grand 3-piece flowing robe"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            Style Photo from Device
          </label>
          <input
            type="file"
            name="imageFile"
            accept="image/*"
            required
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="submit"
            disabled={isUploading}
            style={{
              background: isUploading ? '#64748b' : '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: isUploading ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? '⏳ Uploading Style...' : '+ Save Sewing Style'}
          </button>
        </div>
      </form>

      {/* Active Sewing Styles List */}
      {styles.length > 0 && (
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {styles.map((st: any) => (
            <div
              key={st.id}
              style={{
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ height: '140px', background: '#e2e8f0' }}>
                <img
                  src={st.image_url}
                  alt={st.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ padding: '12px' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                  {st.name}
                </strong>
                <span style={{ fontSize: '0.92rem', color: '#16a34a', fontWeight: 800 }}>
                  ₦{Number(st.base_price).toLocaleString()}
                </span>

                <button
                  type="button"
                  disabled={deletingId === st.id}
                  onClick={() => handleDelete(st.id, st.name)}
                  style={{
                    marginTop: '10px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: deletingId === st.id ? 'not-allowed' : 'pointer',
                    width: '100%',
                  }}
                >
                  {deletingId === st.id ? 'Deleting...' : '🗑 Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}