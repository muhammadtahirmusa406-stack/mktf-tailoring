'use client';

import React, { useState } from 'react';
import { updateOrderStatusAction } from '@/app/admin/orders/actions';
import { logoutStaffAction } from '../actions';

export default function BranchFloorClient({ orders: initialOrders, profile }: any) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const STAGES = ['CUTTING', 'EMBROIDERY', 'SEWING', 'READY_FOR_PICKUP', 'DELIVERED'];

  const handleAdvance = async (orderId: string, currentStatus: string) => {
    const currentIndex = STAGES.indexOf(currentStatus);
    const nextStatus = STAGES[currentIndex + 1] || 'READY_FOR_PICKUP';

    setUpdatingId(orderId);
    await updateOrderStatusAction(orderId, nextStatus);
    setUpdatingId(null);

    setOrders((prev: any[]) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#f1f5f9', padding: '30px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '28px' }}>
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              BRANCH WORKSHOP FLOOR
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 2px' }}>
              {profile?.branch_name || 'Workshop Branch'}
            </h1>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Logged in as: <strong>{profile?.full_name}</strong> (Child Shop Artisan)
            </span>
          </div>

          <form action={logoutStaffAction}>
            <button
              type="submit"
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Orders Queue */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {orders.map((order: any) => {
            const m = order.customer_measurements || {};
            const isUpdating = updatingId === order.id;

            // Balance check
            const totalPrice = Number(order.total_price) || 0;
            const amountPaid = Number(order.amount_paid) || 0;
            const isFullyPaid = order.payment_status === '100%_FULLY_PAID' || (totalPrice > 0 && amountPaid >= totalPrice);
            const isReadyForPickup = order.status === 'READY_FOR_PICKUP' || order.status === 'READY';
            const isDelivered = order.status === 'DELIVERED';

            return (
              <div
                key={order.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                      #{order.order_reference}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: isDelivered ? '#f1f5f9' : isReadyForPickup ? '#dcfce7' : '#e0f2fe',
                        color: isDelivered ? '#475569' : isReadyForPickup ? '#16a34a' : '#0284c7',
                      }}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                      {order.sewing_style_name_at_order}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 700, marginBottom: '6px' }}>
                      Embroidery: {order.design_reference_at_order || 'NONE'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div>• Collar: {order.neck_style || 'Standard'}</div>
                      <div>• Pocket: {order.pocket_style || 'Standard'}</div>
                      <div>• Sleeve: {order.cuff_style || 'Standard'}</div>
                    </div>
                  </div>

                  {/* Body Measurements for Artisan */}
                  {(m.shoulder || m.chest || m.top_length || m.trouser_length) && (
                    <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        📐 Measurements (Inches)
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '0.78rem' }}>
                        <div><strong>Sh:</strong> {m.shoulder || '-'}</div>
                        <div><strong>Ch:</strong> {m.chest || '-'}</div>
                        <div><strong>Sl:</strong> {m.sleeve_length || '-'}</div>
                        <div><strong>Len:</strong> {m.top_length || '-'}</div>
                        <div><strong>Tr:</strong> {m.trouser_length || '-'}</div>
                        <div><strong>W:</strong> {m.trouser_waist || '-'}</div>
                      </div>
                    </div>
                  )}

                  {/* Payment Status Pill */}
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isFullyPaid ? '#dcfce7' : '#fef3c7',
                      color: isFullyPaid ? '#15803d' : '#b45309',
                      border: isFullyPaid ? '1px solid #bbf7d0' : '1px solid #fde68a'
                    }}>
                      {isFullyPaid ? '✓ 100% FULLY PAID' : '⚠ 50% BALANCE UNPAID'}
                    </span>
                  </div>
                </div>

                {/* Stage Advancement & 50% Gate */}
                <div>
                  {isDelivered ? (
                    <div style={{ background: '#f8fafc', padding: '10px', textAlign: 'center', borderRadius: '8px', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                      ✓ Delivered to Customer
                    </div>
                  ) : isReadyForPickup ? (
                    isFullyPaid ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleAdvance(order.id, order.status)}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          width: '100%',
                        }}
                      >
                        {isUpdating ? 'Updating...' : '✓ Mark Delivered / Release Outfit'}
                      </button>
                    ) : (
                      <div style={{
                        background: '#fef2f2',
                        border: '1.5px solid #fca5a5',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                        color: '#991b1b',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        lineHeight: 1.4
                      }}>
                        ⛔ CANNOT DELIVER: Outstanding 50% Balance. Awaiting Master Admin payment verification.
                      </div>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAdvance(order.id, order.status)}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        width: '100%',
                      }}
                    >
                      {isUpdating ? 'Advancing...' : `Advance → ${STAGES[STAGES.indexOf(order.status) + 1] || 'READY_FOR_PICKUP'}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}