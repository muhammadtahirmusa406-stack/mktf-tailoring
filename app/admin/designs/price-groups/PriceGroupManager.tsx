'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type CategoryOption = { id: string; name: string };
export type SewingStyleOption = { id: string; name: string };
type PriceGroup = {
  id: string;
  category_id: string;
  sewing_style_id: string;
  price: number | string;
  display_order: number;
  is_active: boolean;
};
type Props = {
  categories: CategoryOption[];
  styles: SewingStyleOption[];
  initialLoadError: string;
};

const fieldStyle = { width: '100%', boxSizing: 'border-box' as const, padding: 11, border: '1px solid #ccc', borderRadius: 8 };
const buttonStyle = { padding: '10px 14px', border: '1px solid #222', borderRadius: 8, background: '#111', color: '#fff', fontWeight: 600, cursor: 'pointer' };
const groupFields = 'id, category_id, sewing_style_id, price, display_order, is_active';

async function verifyAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Please sign in again to manage price groups.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') throw new Error('Only an admin can manage price groups.');
}

function validPrice(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function validOrder(value: string) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

function formatPrice(value: number | string) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

export default function PriceGroupManager({ categories, styles, initialLoadError }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [categoryId, setCategoryId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [pictureCounts, setPictureCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialLoadError);
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [editActive, setEditActive] = useState(true);

  useEffect(() => {
    let current = true;
    if (!categoryId || !styleId) {
      return () => { current = false; };
    }

    async function loadGroups() {
      setLoading(true);
      setErrorMessage('');
      setFeedback('');
      const { data, error } = await supabase
        .from('design_price_groups')
        .select(groupFields)
        .eq('category_id', categoryId)
        .eq('sewing_style_id', styleId)
        .order('display_order', { ascending: true });
      if (!current) return;
      if (error) {
        setErrorMessage(`Could not load price groups: ${error.message}`);
        setGroups([]);
        setPictureCounts({});
        setLoading(false);
        return;
      }

      const fetchedGroups = (data ?? []) as PriceGroup[];
      setGroups(fetchedGroups);
      if (fetchedGroups.length === 0) {
        setPictureCounts({});
        setLoading(false);
        return;
      }

      const { data: assignments, error: countError } = await supabase
        .from('design_items')
        .select('price_group_id')
        .in('price_group_id', fetchedGroups.map((group) => group.id));
      if (!current) return;
      if (countError) {
        setErrorMessage(`Price groups loaded, but picture counts could not be loaded: ${countError.message}`);
        setPictureCounts({});
      } else {
        const counts: Record<string, number> = {};
        for (const assignment of assignments ?? []) {
          const groupId = assignment.price_group_id as string | null;
          if (groupId) counts[groupId] = (counts[groupId] ?? 0) + 1;
        }
        setPictureCounts(counts);
      }
      setLoading(false);
    }

    void loadGroups();
    return () => { current = false; };
  }, [categoryId, styleId, supabase]);

  function beginEdit(group: PriceGroup) {
    setEditingId(group.id);
    setEditPrice(String(group.price));
    setEditOrder(String(group.display_order));
    setEditActive(group.is_active);
    setErrorMessage('');
    setFeedback('');
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, group: PriceGroup) {
    event.preventDefault();
    setErrorMessage('');
    setFeedback('');
    if (!validPrice(editPrice)) return setErrorMessage('Enter a valid non-negative price.');
    if (!validOrder(editOrder)) return setErrorMessage('Display order must be a non-negative whole number.');
    setSaving(true);
    try {
      await verifyAdmin(supabase);
      const updates = { price: Number(editPrice), display_order: Number(editOrder), is_active: editActive };
      const { error } = await supabase.from('design_price_groups').update(updates).eq('id', group.id);
      if (error) throw error;
      setGroups((current) => current.map((item) => item.id === group.id ? { ...item, ...updates } : item)
        .sort((a, b) => a.display_order - b.display_order));
      setEditingId(null);
      setFeedback('Price group updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update the price group.');
    } finally {
      setSaving(false);
    }
  }

  const selectStyle = { ...fieldStyle, background: '#fff' };
  return (
    <div>
      {initialLoadError && <p role="alert" style={alertStyle}>{initialLoadError}</p>}
      <section style={selectionStyle}>
        <label style={labelStyle}>Design category
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} style={selectStyle}>
            <option value="">Select a category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Sewing style
          <select value={styleId} onChange={(event) => setStyleId(event.target.value)} style={selectStyle}>
            <option value="">Select a sewing style</option>
            {styles.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
          </select>
        </label>
      </section>

      {errorMessage && <p role="alert" style={alertStyle}>{errorMessage}</p>}
      {feedback && <p role="status" style={successStyle}>{feedback}</p>}
      {categoryId && <p style={mutedStyle}>New groups are created with their pictures and cover from the category page: <Link href={`/admin/designs/${categoryId}`}>Open category</Link>.</p>}
      {!categoryId && <p style={mutedStyle}>Select a design category to manage its price groups.</p>}
      {categoryId && !styleId && <p style={mutedStyle}>Select a sewing style to view or create price groups.</p>}

      {categoryId && styleId && <>
        <section style={{ marginTop: 28 }}>
          <h2>Price groups</h2>
          {loading ? <p aria-live="polite">Loading price groups…</p> : groups.length === 0 ? (
            <p style={mutedStyle}>No price groups exist for this category and sewing style yet.</p>
          ) : (
            <div style={groupListStyle}>
              {groups.map((group) => <article key={group.id} style={cardStyle}>
                {editingId === group.id ? (
                  <form onSubmit={(event) => void handleUpdate(event, group)} style={editGridStyle}>
                    <label style={labelStyle}>Price (₦)
                      <input inputMode="decimal" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} style={fieldStyle} />
                    </label>
                    <label style={labelStyle}>Display order
                      <input inputMode="numeric" value={editOrder} onChange={(event) => setEditOrder(event.target.value)} style={fieldStyle} />
                    </label>
                    <label style={checkboxStyle}><input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} /> Active</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="submit" style={buttonStyle} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                      <button type="button" style={secondaryButtonStyle} onClick={() => setEditingId(null)} disabled={saving}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                      <strong style={{ fontSize: 22 }}>{formatPrice(group.price)}</strong>
                      <span style={statusStyle(group.is_active)}>{group.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p style={{ margin: '12px 0 6px', color: '#555' }}>Display order: {group.display_order}</p>
                    <p style={{ margin: 0, color: '#555' }}>
                      {(pictureCounts[group.id] ?? 0) === 0 ? 'No pictures assigned yet.' : `${pictureCounts[group.id]} ${pictureCounts[group.id] === 1 ? 'picture' : 'pictures'} assigned`}
                    </p>
                    <button type="button" style={{ ...secondaryButtonStyle, marginTop: 14 }} onClick={() => beginEdit(group)}>Edit group</button>
                  </>
                )}
              </article>)}
            </div>
          )}
        </section>
      </>}
    </div>
  );
}

const selectionStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, padding: 18, border: '1px solid #ddd', borderRadius: 12, background: '#fff' } as const;
const labelStyle = { display: 'grid', gap: 7, fontWeight: 600 } as const;
const checkboxStyle = { display: 'flex', alignItems: 'center', gap: 8, minHeight: 42 } as const;
const editGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end' } as const;
const groupListStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 } as const;
const cardStyle = { padding: 18, border: '1px solid #ddd', borderRadius: 12, background: '#fff' } as const;
const secondaryButtonStyle = { padding: '9px 12px', border: '1px solid #bbb', borderRadius: 8, background: '#fff', color: '#111', fontWeight: 600, cursor: 'pointer' } as const;
const mutedStyle = { color: '#666' } as const;
const alertStyle = { padding: 12, borderRadius: 8, color: '#8f1d1d', background: '#fff0f0' } as const;
const successStyle = { padding: 12, borderRadius: 8, color: '#176b17', background: '#eaf7ea' } as const;
const statusStyle = (active: boolean) => ({ padding: '5px 9px', borderRadius: 20, background: active ? '#eaf7ea' : '#eee', color: active ? '#176b17' : '#666', fontSize: 12, whiteSpace: 'nowrap' as const });
