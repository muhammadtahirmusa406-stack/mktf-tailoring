import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams: Promise<{ ref?: string }>;
};

const STATUS_STEPS = [
  { key: 'NEW', label: 'Order Received', desc: 'Authoritative order submitted.' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Fabric & details reviewed by shop.' },
  { key: 'ASSIGNED', label: 'Assigned to Tailor', desc: 'Craftsman assigned for cutting.' },
  { key: 'IN PRODUCTION', label: 'In Production', desc: 'Cutting, stitching & embroidery.' },
  { key: 'READY', label: 'Ready for Pickup / Fitting', desc: 'Ironed and ready.' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Order collected by customer.' },
];

function getStatusRank(status: string): number {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETED') return 4; // Map COMPLETED to READY
  const idx = STATUS_STEPS.findIndex((s) => s.key === normalized);
  return idx >= 0 ? idx : 0;
}

export default async function TrackOrderPage({ searchParams }: Props) {
  const { ref } = await searchParams;
  const rawRef = typeof ref === 'string' ? ref.trim().toUpperCase() : '';

  let order = null;
  let notFound = false;

  if (rawRef) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('orders')
      .select(`
        order_reference,
        customer_name,
        customer_phone,
        status,
        fabric_name_at_order,
        design_reference_at_order,
        design_name_at_order,
        sewing_style_name_at_order,
        total_price_at_order,
        measurements,
        created_at
      `)
      .eq('order_reference', rawRef)
      .maybeSingle();

    if (data) {
      order = data;
    } else {
      notFound = true;
    }
  }

  const currentRank = order ? getStatusRank(order.status) : 0;
  const whatsappHelpUrl = order
    ? `https://wa.me/?text=${encodeURIComponent(`Hello, I would like to check on my order ${order.order_reference}`)}`
    : '';

  return (
    <main style={{ minHeight: 'calc(100vh - 80px)', background: '#f8faf9', padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        
        {/* Header & Search Bar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ margin: 0, color: '#176b4d', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Live Status Tracker
          </p>
          <h1 style={{ margin: '8px 0 10px', fontSize: 26, color: '#111827' }}>Track Your Order</h1>
          <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
            Enter your 8-digit order reference to see live workshop updates.
          </p>

          <form action="/track" method="GET" style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
            <input
              type="text"
              name="ref"
              defaultValue={rawRef}
              placeholder="e.g. ORD-F09E2B28"
              autoCapitalize="characters"
              autoComplete="off"
              required
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 16,
                letterSpacing: '0.04em',
                fontWeight: 600,
                textTransform: 'uppercase',
                background: '#fff',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 20px',
                background: '#176b4d',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Track
            </button>
          </form>
        </div>

        {notFound && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 16, borderRadius: 12, textAlign: 'center', marginBottom: 20 }}>
            No order found matching reference <strong>{rawRef}</strong>. Please double-check your code.
          </div>
        )}

        {/* Order Details & Stepper */}
        {order && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
            
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #f3f4f6', paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>Order Reference</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 22, color: '#111827', letterSpacing: '0.04em' }}>{order.order_reference}</h2>
                <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: 14 }}>
                  Customer: <strong>{order.customer_name || 'Guest'}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 20, background: '#e4f5ec', color: '#176b4d', fontSize: 13, fontWeight: 700 }}>
                  {order.status.replace(/_/g, ' ')}
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>
                  {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Visual Timeline Stepper */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#374151' }}>Production Progress</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx <= currentRank;
                  const isCurrent = idx === currentRank;

                  return (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isDone ? '#176b4d' : '#e5e7eb',
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            display: 'grid',
                            placeItems: 'center',
                            border: isCurrent ? '3px solid #b7e3cd' : 'none',
                          }}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                          <div style={{ width: 2, height: 26, background: isDone ? '#176b4d' : '#e5e7eb', marginTop: 4 }} />
                        )}
                      </div>
                      <div style={{ paddingTop: 2 }}>
                        <strong style={{ fontSize: 14, color: isDone ? '#111827' : '#9ca3af' }}>{step.label}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: isDone ? '#4b5563' : '#9ca3af' }}>{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Specifications Summary */}
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>Garment Details</h3>
              <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Fabric:</span>
                  <strong style={{ color: '#111827' }}>{order.fabric_name_at_order}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Design Reference:</span>
                  <strong style={{ color: '#111827' }}>{order.design_reference_at_order} ({order.design_name_at_order})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Sewing Style:</span>
                  <strong style={{ color: '#111827' }}>{order.sewing_style_name_at_order}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>Total Price:</span>
                  <strong style={{ fontSize: 16, color: '#176b4d' }}>
                    ₦{Number(order.total_price_at_order ?? 0).toLocaleString('en-NG')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gap: 10 }}>
              <a
                href={whatsappHelpUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  background: '#25d366',
                  color: '#fff',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Inquire on WhatsApp 💬
              </a>
              <Link
                href="/"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Return to Home
              </Link>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
