'use client';

import React from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function PrintJobSlipClient({ order }: { order: any }) {
  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/track?query=${order.order_reference}`
    : `http://localhost:3000/track?query=${order.order_reference}`;

  const remaining = Number(order.total_price || 0) - Number(order.amount_paid || 0);
  const isFullyPaid = remaining <= 0 || order.payment_status === '100%_FULLY_PAID';
  const m = order.customer_measurements || {};

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '30px 16px', fontFamily: 'system-ui, sans-serif' }}>
      
      <div
        className="no-print"
        style={{
          maxWidth: '540px',
          margin: '0 auto 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/admin/orders"
          style={{
            color: '#0f172a',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 700,
          }}
        >
          ← Back to MKTF Orders
        </Link>

        <button
          onClick={() => window.print()}
          style={{
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <div
        id="job-slip"
        style={{
          maxWidth: '540px',
          margin: '0 auto',
          background: '#ffffff',
          border: '2px dashed #0f172a',
          borderRadius: '12px',
          padding: '24px',
          color: '#0f172a',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            MKTF TAILORING WORKSHOP JOB TAG
          </span>
          <h1 style={{ margin: '4px 0', fontSize: '1.6rem', fontWeight: 900 }}>
            #{order.order_reference}
          </h1>
          <div style={{ fontSize: '0.8rem', color: '#475569' }}>
            Booked Date: {new Date(order.created_at || Date.now()).toLocaleDateString('en-GB')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
          <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', display: 'flex', border: '1px solid #cbd5e1' }}>
            <QRCodeSVG value={trackingUrl} size={90} level="M" />
          </div>
          <div>
            <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '2px' }}>
              Scan to Track MKTF Garment
            </strong>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              Point any smartphone camera to check stage progression and pickup clearance.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>CLIENT NAME:</span>
            <strong style={{ fontSize: '0.95rem' }}>{order.customer_name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>PHONE / WHATSAPP:</span>
            <strong style={{ fontSize: '0.9rem' }}>{order.customer_phone}</strong>
          </div>
        </div>

        {/* Body Measurements for Artisan */}
        {(m.shoulder || m.chest || m.top_length || m.trouser_length) && (
          <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              📐 CLIENT BODY MEASUREMENTS (INCHES)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.82rem' }}>
              <div><strong>Shoulder:</strong> {m.shoulder || '-'}</div>
              <div><strong>Chest:</strong> {m.chest || '-'}</div>
              <div><strong>Sleeve:</strong> {m.sleeve_length || '-'}</div>
              <div><strong>Top Len:</strong> {m.top_length || '-'}</div>
              <div><strong>Trouser:</strong> {m.trouser_length || '-'}</div>
              <div><strong>Waist:</strong> {m.trouser_waist || '-'}</div>
            </div>
            {m.notes && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                <em>Note: {m.notes}</em>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            FINISHING SPECIFICATIONS
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
            <span>Style Cut:</span>
            <strong>{order.sewing_style_name_at_order || 'Standard'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
            <span>Embroidery Code:</span>
            <strong style={{ color: '#4338ca' }}>{order.design_reference_at_order || 'NONE'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.82rem' }}>
            <span>Collar / Neck:</span>
            <span>{order.neck_style}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.82rem' }}>
            <span>Pocket:</span>
            <span>{order.pocket_style}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span>Sleeve / Cuff:</span>
            <span>{order.cuff_style}</span>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Total Tailoring Bill:</span>
            <strong style={{ fontSize: '0.92rem' }}>₦{Number(order.total_price || 0).toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Deposit Paid:</span>
            <strong style={{ fontSize: '0.92rem', color: '#16a34a' }}>₦{Number(order.amount_paid || 0).toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Balance at Pickup:</span>
            <strong style={{ fontSize: '1.05rem', color: isFullyPaid ? '#16a34a' : '#d97706' }}>
              {isFullyPaid ? '₦0 (PAID)' : `₦${remaining.toLocaleString()}`}
            </strong>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          MKTF Workshop • Keep attached to fabric bundle until final pressing & delivery.
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #job-slip {
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}