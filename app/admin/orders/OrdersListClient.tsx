'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  updateOrderStatusAction,
  bulkUpdateOrderStatusAction,
  assignOrderToShopAction,
} from './actions';

type ChildShop = {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
};

type OrderItem = {
  id: string;
  order_reference: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  child_shop_id?: string | null;
  fabric_name_at_order: string | null;
  fabric_reference_at_order: string | null;
  design_reference_at_order: string | null;
  sewing_style_name_at_order: string | null;
  total_price_at_order: number | null;
  measurements: Record<string, unknown> | null;
  created_at: string;
};

const NEXT_STAGE: Record<string, { label: string; nextStatus: string; isGreen?: boolean }> = {
  'NEW': { label: 'Start Production →', nextStatus: 'IN PRODUCTION' },
  'CONFIRMED': { label: 'Start Production →', nextStatus: 'IN PRODUCTION' },
  'ASSIGNED': { label: 'Start Production →', nextStatus: 'IN PRODUCTION' },
  'IN PRODUCTION': { label: '✓ Mark Ready for Pickup', nextStatus: 'READY', isGreen: true },
  'READY': { label: '📦 Mark Delivered', nextStatus: 'DELIVERED', isGreen: true },
};

const ALL_STATUSES = ['NEW', 'CONFIRMED', 'ASSIGNED', 'IN PRODUCTION', 'READY', 'DELIVERED'];

export default function OrdersListClient({
  orders,
  childShops,
}: {
  orders: OrderItem[];
  childShops: ChildShop[];
}) {
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);

  const toggleSelect = (ref: string) => {
    setSelectedRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRefs.length === orders.length) {
      setSelectedRefs([]);
    } else {
      setSelectedRefs(orders.map((o) => o.order_reference));
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'READY' || s === 'DELIVERED') {
      return { bg: '#dcfce7', text: '#14532d', border: '#86efac' };
    }
    if (s === 'IN PRODUCTION') {
      return { bg: '#fef3c7', text: '#92400e', border: '#fde047' };
    }
    if (s === 'ASSIGNED') {
      return { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' };
    }
    if (s === 'CANCELLED') {
      return { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' };
    }
    return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
  };

  return (
    <div>
      {selectedRefs.length > 0 && (
        <div
          style={{
            background: '#0f172a',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          }}
        >
          <span>
            <strong>{selectedRefs.length}</strong> order(s) selected
          </span>
          <form action={bulkUpdateOrderStatusAction} style={{ display: 'flex', gap: '10px' }}>
            <input type="hidden" name="orderRefs" value={selectedRefs.join(',')} />
            <select
              name="status"
              defaultValue="IN PRODUCTION"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <button
              type="submit"
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              Update Status
            </button>
          </form>
        </div>
      )}

      {orders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 0',
            color: '#64748b',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          No orders match this status filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
            <input
              type="checkbox"
              id="selectAll"
              checked={selectedRefs.length === orders.length && orders.length > 0}
              onChange={toggleSelectAll}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="selectAll" style={{ fontSize: '0.85rem', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
              Select All Orders ({orders.length})
            </label>
          </div>

          {orders.map((o) => {
            const assignedShop = childShops.find((s) => s.id === o.child_shop_id);
            const isSelected = selectedRefs.includes(o.order_reference);
            const badge = getStatusBadge(o.status);
            const nextAction = NEXT_STAGE[o.status];

            return (
              <div
                key={o.id}
                style={{
                  border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(o.order_reference)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{o.order_reference}</strong>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        letterSpacing: '0.04em',
                      }}
                    >
                      ● {o.status}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                    {new Date(o.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Specs Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    fontSize: '0.9rem',
                    background: '#f8fafc',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>CUSTOMER</span>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{o.customer_name || 'Anonymous'}</div>
                    <div style={{ color: '#475569', fontSize: '0.82rem' }}>{o.customer_phone}</div>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>FABRIC</span>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{o.fabric_name_at_order || 'Custom Fabric'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Ref: {o.fabric_reference_at_order || 'N/A'}</div>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>STYLE & EMBROIDERY</span>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{o.sewing_style_name_at_order || 'Standard Cut'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Embr: {o.design_reference_at_order || 'None'}</div>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>FINANCIAL VALUE</span>
                    <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.05rem', marginTop: '2px' }}>
                      {o.total_price_at_order ? `₦${Number(o.total_price_at_order).toLocaleString()}` : 'Custom Quote'}
                    </div>
                  </div>
                </div>

                {/* Measurements */}
                {o.measurements && Object.keys(o.measurements).length > 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <strong style={{ color: '#0f172a' }}>Body Measurements: </strong>
                    {Object.entries(o.measurements)
                      .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}"`)
                      .join(' | ')}
                  </div>
                )}

                {/* Footer Controls */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '14px',
                    gap: '12px',
                  }}
                >
                  {/* Shop Assignment */}
                  <form
                    action={assignOrderToShopAction}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <input type="hidden" name="orderRef" value={o.order_reference} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      Workshop Floor:
                    </span>
                    <select
                      name="childShopId"
                      defaultValue={o.child_shop_id || 'UNASSIGNED'}
                      onChange={(e) => e.target.form?.requestSubmit()}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: assignedShop ? 700 : 500,
                        background: assignedShop ? '#ede9fe' : '#ffffff',
                        color: assignedShop ? '#5b21b6' : '#0f172a',
                        borderColor: assignedShop ? '#c4b5fd' : '#cbd5e1',
                      }}
                    >
                      <option value="UNASSIGNED">Main HQ (In-House)</option>
                      {childShops.map((s) => (
                        <option key={s.id} value={s.id}>
                          🏢 {s.name} ({s.location || 'Branch'})
                        </option>
                      ))}
                    </select>
                  </form>

                  {/* Stage Advancement Button */}
                  {nextAction && (
                    <form action={updateOrderStatusAction}>
                      <input type="hidden" name="orderRef" value={o.order_reference} />
                      <input type="hidden" name="status" value={nextAction.nextStatus} />
                      <button
                        type="submit"
                        style={{
                          background: nextAction.isGreen ? '#16a34a' : '#0f172a',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          boxShadow: nextAction.isGreen ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
                        }}
                      >
                        {nextAction.label}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
