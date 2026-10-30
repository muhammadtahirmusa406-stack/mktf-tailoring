'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateOrderStatusAction, confirmFinalPaymentAction } from './actions';

const STAGES = ['NEW', 'CUTTING', 'EMBROIDERY', 'SEWING', 'READY FOR PICKUP', 'COMPLETED'];

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'NEW': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  'CUTTING': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'EMBROIDERY': { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  'SEWING': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  'READY FOR PICKUP': { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  'COMPLETED': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

export default function OrdersProgressionClient({ initialOrders }: { initialOrders: any[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    const res = await updateOrderStatusAction(orderId, nextStatus);
    setUpdatingId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } else {
      alert('Error updating status: ' + res.error);
    }
  };

  const handleConfirmFinalPayment = async (orderId: string, totalPrice: number) => {
    if (!confirm('Confirm that the remaining balance has been received in OPay? This marks the order as 100% PAID and COMPLETED.')) return;

    setUpdatingId(orderId);
    const res = await confirmFinalPaymentAction(orderId, totalPrice);
    setUpdatingId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'COMPLETED', payment_status: '100%_FULLY_PAID', amount_paid: totalPrice }
            : o
        )
      );
    } else {
      alert('Error confirming payment: ' + res.error);
    }
  };

  const filteredOrders = activeFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === activeFilter);

  return (
    <div>
      {/* Quick Stage Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
        {['ALL', ...STAGES].map((st) => {
          const count = st === 'ALL' ? orders.length : orders.filter((o) => o.status === st).length;
          const isActive = activeFilter === st;
          return (
            <button
              key={st}
              onClick={() => setActiveFilter(st)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#0f172a' : '#ffffff',
                color: isActive ? '#ffffff' : '#64748b',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                whiteSpace: 'nowrap',
              }}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          No orders found in <strong>{activeFilter}</strong>.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredOrders.map((order) => {
            const currentStageIndex = STAGES.indexOf(order.status);
            const nextStage = currentStageIndex >= 0 && currentStageIndex < STAGES.length - 1
              ? STAGES[currentStageIndex + 1]
              : null;
            const prevStage = currentStageIndex > 0 ? STAGES[currentStageIndex - 1] : null;

            const remainingBalance = Number(order.total_price || 0) - Number(order.amount_paid || 0);
            const isFullyPaid = remainingBalance <= 0 || order.payment_status === '100%_FULLY_PAID';

            const badge = STAGE_COLORS[order.status] || { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

            return (
              <div
                key={order.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '22px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Top Bar: Order Ref, Print Slip Link & Stage Selector */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                        #{order.order_reference}
                      </span>
                      <Link
                        href={`/admin/orders/${order.id}/print`}
                        target="_blank"
                        style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textDecoration: 'none',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        🖨️ Slip
                      </Link>
                    </div>

                    {/* Direct Stage Selector Dropdown */}
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        border: `1.5px solid ${badge.border}`,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Info */}
                  <div style={{ marginBottom: '14px' }}>
                    <h3 style={{ margin: '0 0 2px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {order.customer_name || 'Client'}
                    </h3>
                    <a
                      href={`https://wa.me/${(order.customer_phone || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}
                    >
                      💬 {order.customer_phone}
                    </a>
                  </div>

                  {/* Garment Breakdown */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', fontSize: '0.84rem', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Style:</span>
                      <strong style={{ color: '#0f172a' }}>{order.sewing_style_name_at_order || 'Baban Riga'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Embroidery:</span>
                      <strong style={{ color: '#6366f1' }}>{order.design_reference_at_order || 'MOR-001'}</strong>
                    </div>
                    {order.neck_style && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '0.78rem', color: '#475569' }}>
                        <span>Neck:</span>
                        <span>{order.neck_style}</span>
                      </div>
                    )}
                    {order.pocket_style && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569' }}>
                        <span>Pocket:</span>
                        <span>{order.pocket_style}</span>
                      </div>
                    )}
                  </div>

                  {/* Ledger Breakdown */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Total Bill:</span>
                      <strong style={{ color: '#0f172a' }}>₦{Number(order.total_price || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: isFullyPaid ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                        {isFullyPaid ? '✓ Fully Paid' : 'Pending Balance:'}
                      </span>
                      <strong style={{ color: isFullyPaid ? '#16a34a' : '#d97706' }}>
                        {isFullyPaid ? '₦0' : `₦${remainingBalance.toLocaleString()}`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Status Progression Controls */}
                <div>
                  {!isFullyPaid && (order.status === 'READY FOR PICKUP' || order.status === 'SEWING') && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleConfirmFinalPayment(order.id, Number(order.total_price))}
                      style={{
                        width: '100%',
                        marginBottom: '8px',
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1.5px solid #86efac',
                        padding: '9px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      💰 Confirm Final ₦{remainingBalance.toLocaleString()} Balance Received
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {prevStage && (
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, prevStage)}
                        style={{
                          flex: 1,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          padding: '9px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        ← {prevStage}
                      </button>
                    )}

                    {nextStage && (
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, nextStage)}
                        style={{
                          flex: 2,
                          background: '#0f172a',
                          border: 'none',
                          color: '#ffffff',
                          padding: '9px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        Advance to {nextStage} →
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}