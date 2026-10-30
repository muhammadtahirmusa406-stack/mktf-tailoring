import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import AdminGalleryClient from './admin-gallery-client';
import { addSewingStyleAction, addDesignBatchAction } from './actions';

export const dynamic = 'force-dynamic';

async function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled when called from server components
          }
        },
      },
    }
  );
}

export default async function AdminCatalogPage() {
  const supabase = await getSupabaseServer();

  let styles: any[] = [];
  let designs: any[] = [];

  if (supabase) {
    const { data: rawStyles } = await supabase.from('sewing_styles').select('*').order('created_at', { ascending: false });
    styles = rawStyles || [];

    const { data: rawDesigns } = await supabase.from('embroidery_designs').select('*').order('created_at', { ascending: false });
    designs = rawDesigns || [];
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>
            Master HQ Catalog Manager
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 8px 0' }}>
            Styles & Artwork Studio
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
            Upload real atelier garment photos and set sewing and embroidery charges.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/admin/orders"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            Orders Queue
          </Link>
          <Link
            href="/catalog"
            target="_blank"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            View Live Client Catalog
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* Card 1: Sewing Style Upload */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.4rem' }}>✂️</span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Upload Sewing Cut / Style
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Baban Riga, Kaftan, Senator, Jalabiya
              </p>
            </div>
          </div>

          <form action={addSewingStyleAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Style Name
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Baban Riga (3-Piece), Luxury Kaftan"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Sewing Charge (₦)
                </label>
                <input
                  type="number"
                  name="base_price"
                  required
                  placeholder="35000"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  name="category"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff' }}
                >
                  <option value="Baban Riga">Baban Riga</option>
                  <option value="Kaftan">Kaftan</option>
                  <option value="Senator">Senator</option>
                  <option value="Jalabiya">Jalabiya</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Short Description
              </label>
              <input
                type="text"
                name="description"
                placeholder="e.g. Grand 3-piece flowing robe with internal vest"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Style Photo from Device
              </label>
              <input
                type="file"
                name="image"
                accept="image/*"
                required
                style={{ width: '100%', fontSize: '0.85rem', color: '#475569' }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: '6px',
                padding: '12px',
                borderRadius: '8px',
                background: '#047857',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              + Save Sewing Style
            </button>
          </form>
        </div>

        {/* Card 2: Batch Embroidery Uploader */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.4rem' }}>📁</span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Device Photo Batch Uploader
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Select multiple photos at once; system auto-numbers them.
              </p>
            </div>
          </div>

          <form action={addDesignBatchAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Category / Group Name
              </label>
              <input
                type="text"
                name="category"
                required
                placeholder="e.g. Moroccan Zare, Monogram, Royal Neck"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Code Prefix (Auto-Numbers)
                </label>
                <input
                  type="text"
                  name="code_prefix"
                  required
                  placeholder="e.g. MOR, MONO, ZAR"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', textTransform: 'uppercase', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Flat Price for this Batch (₦)
                </label>
                <input
                  type="number"
                  name="base_price"
                  required
                  placeholder="25000"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Select Photos (Multiple Allowed)
              </label>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                required
                style={{ width: '100%', fontSize: '0.85rem', color: '#475569' }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: '6px',
                padding: '12px',
                borderRadius: '8px',
                background: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Upload Batch of Designs
            </button>
          </form>
        </div>
      </div>

      {/* Active Sewing Styles List */}
      {styles.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
            Active Tailoring Cuts ({styles.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {styles.map((st: any) => (
              <div key={st.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {st.image_url ? (
                  <img src={st.image_url} alt={st.name} style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ height: '180px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Photo</div>
                )}
                <div style={{ padding: '12px' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', margin: '0 0 4px 0' }}>{st.name}</p>
                  <p style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700, margin: 0 }}>₦{Number(st.base_price || 0).toLocaleString()}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>{st.category || 'Cut'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embroidery Designs Gallery */}
      <AdminGalleryClient initialDesigns={designs || []} initialStyles={styles || []} />

    </div>
  );
}