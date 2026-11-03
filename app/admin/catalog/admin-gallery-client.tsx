'use client';

import React, { useState, useTransition } from 'react';
import { 
  deleteDesignAction, 
  deleteSewingStyleAction, 
  deleteMultipleDesignsAction, 
  deleteMultipleStylesAction 
} from './actions';

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
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toggle selection for bulk actions
  const toggleSelectStyle = (id: string) => {
    setSelectedStyles(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectDesign = (id: string) => {
    setSelectedDesigns(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    if (activeTab === 'all' || activeTab === 'styles') {
      setSelectedStyles(initialStyles.map(s => s.id));
    }
    if (activeTab === 'all' || activeTab === 'designs') {
      setSelectedDesigns(initialDesigns.map(d => d.id));
    }
  };

  const clearSelection = () => {
    setSelectedStyles([]);
    setSelectedDesigns([]);
  };

  // Single Delete Handlers
  const handleDeleteStyle = async (id: string, name: string) => {
    if (!window.confirm(`Delete style "${name}"? Customers will no longer see it.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteSewingStyleAction(id);
      setSelectedStyles(prev => prev.filter(item => item !== id));
      setDeletingId(null);
    });
  };

  const handleDeleteDesign = async (id: string, code: string) => {
    if (!window.confirm(`Delete embroidery design "${code}"? Customers will no longer see it.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteDesignAction(id);
      setSelectedDesigns(prev => prev.filter(item => item !== id));
      setDeletingId(null);
    });
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    const totalCount = selectedStyles.length + selectedDesigns.length;
    if (totalCount === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${totalCount} selected item(s)? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      if (selectedStyles.length > 0) {
        await deleteMultipleStylesAction(selectedStyles);
        setSelectedStyles([]);
      }
      if (selectedDesigns.length > 0) {
        await deleteMultipleDesignsAction(selectedDesigns);
        setSelectedDesigns([]);
      }
    });
  };

  const totalSelected = selectedStyles.length + selectedDesigns.length;

  return (
    <div style={{ marginTop: '48px', position: 'relative' }}>
      {/* Floating Bulk Action Bar */}
      {totalSelected > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: '#0f172a',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '50px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          border: '1px solid #334155'
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {totalSelected} item{totalSelected > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={clearSelection}
            style={{
              background: '#334155',
              border: 'none',
              color: '#cbd5e1',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            Clear
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            style={{
              background: '#ef4444',
              border: 'none',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPending ? 'Deleting...' : `Delete Selected (${totalSelected}) 🗑️`}
          </button>
        </div>
      )}

      {/* Tabs & Bulk Selection Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '2px solid #e2e8f0', 
        paddingBottom: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={selectAllVisible}
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            Select All
          </button>
          {totalSelected > 0 && (
            <button
              onClick={clearSelection}
              style={{
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              Deselect All
            </button>
          )}
        </div>
      </div>

      {/* Sewing Styles Grid */}
      {(activeTab === 'all' || activeTab === 'styles') && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
            Sewing Styles & Silhouettes
          </h2>
          {initialStyles.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No sewing styles found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {initialStyles.map((item) => {
                const isSelected = selectedStyles.includes(item.id);
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      border: isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      background: '#fff', 
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}
                  >
                    {/* Top Controls: Checkbox and Delete Button */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      right: '8px',
                      zIndex: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectStyle(item.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                      />
                      <button
                        onClick={() => handleDeleteStyle(item.id, item.name)}
                        disabled={deletingId === item.id || isPending}
                        title="Delete Style"
                        style={{
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        {deletingId === item.id ? '...' : '🗑️ Delete'}
                      </button>
                    </div>

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
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Embroidery Designs Grid */}
      {(activeTab === 'all' || activeTab === 'designs') && (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
            Embroidery Designs & Artwork
          </h2>
          {initialDesigns.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No embroidery designs found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {initialDesigns.map((item) => {
                const isSelected = selectedDesigns.includes(item.id);
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      border: isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      background: '#fff', 
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}
                  >
                    {/* Top Controls: Checkbox and Delete Button */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      right: '8px',
                      zIndex: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectDesign(item.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                      />
                      <button
                        onClick={() => handleDeleteDesign(item.id, item.code || item.name)}
                        disabled={deletingId === item.id || isPending}
                        title="Delete Design"
                        style={{
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        {deletingId === item.id ? '...' : '🗑️ Delete'}
                      </button>
                    </div>

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
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
