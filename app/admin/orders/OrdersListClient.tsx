'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateOrderStatusAction, bulkUpdateOrderStatusAction } from './actions';

type OrderItem = {
  id: string;
  order_reference: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  fabric_name_at_order: string | null;
  fabric_reference_at_order: string | null;
  design_reference_at_order: string | null;
  sewing_style_name_at_order: string | null;
  total_price_at_order: number | null;
  measurements: Record<string, unknown> | null;
  created_at: string;
};

const NEXT_STAGE: Record<string, { label: string; nextStatus: string }> = {
  'NEW': { label: 'Start Production →', nextStatus: 'IN PRODUCTION' },
  'CONFIRMED': { label: 'Start Production →', nextStatus: 'IN PRODUCTION' },
  'ASSIGNED': { label: 'Start Production →', nextStatus: 'IN PRODUCTION' },
  'IN PRODUCTION': { label: 'Mark Ready for Pickup ✓', nextStatus: 'READY' },
  'READY': { label: 'Mark Delivered 📦', nextStatus: 'DELIVERED' },
};

const ALL_STATUSES = ['NEW', 'CONFIRMED', 'ASSIGNED', 'IN PRODUCTION', 'READY', 'DELIVERED'];

export default function OrdersListClient({ orders }: { orders: OrderItem[] }) {
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

  return (
    <div>
      {/* Bulk Action Toolbar */}
      {orders.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          background: selectedRefs.length > 0 ? '#eef7f2' : '#fff',
          border: selectedRefs.length > 0 ? '1px solid #176b4d' : '1px solid #e5e7eb',
          borderRadius: 12,
          marginBottom: 16,
          transition: 'all 0.2s ease',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}>
            <input
              type="checkbox"
              checked={selectedRefs.length > 0 && selectedRefs.length === orders.length}
              onChange={toggleSelectAll}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#176b4d' }}
            />
            <span>Select All Visible ({selectedRefs.length} selected)</span>
          </label>

          {selectedRefs.length > 0 && (
            <form action={bulkUpdateOrderStatusAction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="hidden" name="orderRefs" value={selectedRefs.join(',')} />
              <select
                name="status"
                defaultValue="IN PRODUCTION"
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #176b4d',
                  background: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>Move to: {st}</option>
                ))}
              </select>
              <button
                type="submit"
                style={{
                  padding: '7px 16px',
                  background: '#176b4d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Apply to Selected ({selectedRefs.length})
              </button>
            </form>
          )}
        </div>
      )}

      {/* Orders Grid/List */}
      <div style={{ display: 'grid', gap: 14 }}>
        {orders.map((ord) => {
          const isSelected = selectedRefs.includes(ord.order_reference);
          const nextAction = NEXT_STAGE[ord.status.toUpperCase()];
          const measurementsObj = (ord.measurements && typeof ord.measurements === 'object') ? ord.measurements : {};
          const measurementEntries = Object.entries(measurementsObj);

          return (
            <div
              key={ord.id}
              style={{
                background: '#fff',
                border: isSelected ? '2px solid #176b4d' : '1px solid #e5e7eb',
                borderRadius: 14,
                padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #f3f4f6', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(ord.order_reference)}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#176b4d' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 17, color: '#111827', letterSpacing: '0.04em' }}>
                        {ord.order_reference}
                      </strong>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#e4f5ec', color: '#176b4d' }}>
                        {ord.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {ord.customer_name || 'Guest'} · {ord.customer_phone || 'No phone'}
                    </span>
                  </div>
                </div>

                {/* Direct 1-Click Fast Forward Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {nextAction && (
                    <form action={updateOrderStatusAction}>
                      <input type="hidden" name="orderRef" value={ord.order_reference} />
                      <input type="hidden" name="status" value={nextAction.nextStatus} />
                      <button
                        type="submit"
                        style={{
                          padding: '6px 14px',
                          background: '#176b4d',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {nextAction.label}
                      </button>
                    </form>
                  )}

                  {/* Manual Dropdown fallback */}
                  <form action={updateOrderStatusAction} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="hidden" name="orderRef" value={ord.order_reference} />
                    <select
                      name="status"
                      defaultValue={ord.status}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 12,
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      style={{
                        padding: '5px 10px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Set
                    </button>
                  </form>
                </div>
              </div>

              {/* Garment Details Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13, color: '#4b5563' }}>
                <div>
                  <span>Fabric: <strong>{ord.fabric_name_at_order}</strong></span>
                  <span style={{ margin: '0 8px' }}>·</span>
                  <span>Style: <strong>{ord.sewing_style_name_at_order}</strong></span>
                </div>
                <div>
                  <strong style={{ fontSize: 15, color: '#176b4d' }}>
                    ₦{Number(ord.total_price_at_order ?? 0).toLocaleString('en-NG')}
                  </strong>
                </div>
              </div>

              {/* Collapsible Cut Specs */}
              {measurementEntries.length > 0 && (
                <details style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Cutting specs ({measurementEntries.length})</summary>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {measurementEntries.map(([k, v]) => (
                      <span key={k} style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, color: '#111827' }}>
                        {k.replace(/_/g, ' ')}: <strong>{String(v)}</strong>
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
