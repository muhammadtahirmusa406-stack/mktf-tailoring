import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STAGES = ['NEW', 'CUTTING', 'EMBROIDERY', 'SEWING', 'READY FOR PICKUP', 'COMPLETED'];

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query = '' } = await searchParams;
  const cleanQuery = query.trim();

  let order: any = null;

  if (cleanQuery) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .or(`order_reference.ilike.%${cleanQuery}%,customer_phone.ilike.%${cleanQuery}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    order = data;
  }

  const currentStageIndex = order ? STAGES.indexOf(order.status) : -1;
  const progressPercent = currentStageIndex >= 0 ? Math.round(((currentStageIndex + 1) / STAGES.length) * 100) : 0;

  const total = Number(order?.total_price || 0);
  const paid = Number(order?.amount_paid || 0);
  const balanceRemaining = total - paid;
  const isFullyPaid = balanceRemaining <= 0 || order?.payment_status === '100%_FULLY_PAID';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            BESPOKE ATELIER LIVE TRACKER
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>
            Track Your Outfit Production
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Enter your Order Reference (#ORD-...) or phone number to see cutting and sewing updates.
          </p>
        </div>

        {/* Search Bar */}
        <form method="GET" style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <input
            type="text"
            name="query"
            defaultValue={cleanQuery}
            placeholder="Enter Order # (e.g. ORD-8A3F12) or Phone"
            required
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Track
          </button>
        </form>

        {order ? (
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ORDER NUMBER</span>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>
                  #{order.order_reference}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>CLIENT</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  {order.customer_name}
                </div>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  CURRENT STAGE: <span style={{ color: '#6366f1' }}>{order.status}</span>
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b' }}>
                  {progressPercent}%
                </span>
              </div>

              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: order.status === 'READY FOR PICKUP' || order.status === 'COMPLETED' ? '#16a34a' : '#6366f1',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Stage Pills */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                {STAGES.map((st, i) => {
                  const isDone = i <= currentStageIndex;
                  return (
                    <span
                      key={st}
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: isDone ? 800 : 500,
                        color: isDone ? '#0f172a' : '#94a3b8',
                      }}
                    >
                      {st === 'READY FOR PICKUP' ? 'PICKUP' : st}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Garment Specifications */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                Garment Specifications
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Sewing Style:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{order.sewing_style_name_at_order}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Embroidery Art:</span>
                  <div style={{ fontWeight: 700, color: '#6366f1' }}>{order.design_reference_at_order}</div>
                </div>
                {order.neck_style && (
                  <div>
                    <span style={{ color: '#64748b' }}>Collar / Neck:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.neck_style}</div>
                  </div>
                )}
                {order.pocket_style && (
                  <div>
                    <span style={{ color: '#64748b' }}>Pocket Cut:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.pocket_style}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Balance Status */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Total Tailoring:</span>
                <strong style={{ color: '#0f172a' }}>₦{total.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Amount Paid (Deposit):</span>
                <strong style={{ color: '#16a34a' }}>₦{paid.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ fontWeight: 800, color: isFullyPaid ? '#16a34a' : '#d97706' }}>
                  {isFullyPaid ? '✓ 100% Fully Settled' : 'Balance Remaining at Pickup:'}
                </span>
                <strong style={{ fontSize: '1.2rem', color: isFullyPaid ? '#16a34a' : '#d97706' }}>
                  {isFullyPaid ? '₦0' : `₦${balanceRemaining.toLocaleString()}`}
                </strong>
              </div>

              {/* Show Bank Details if balance is pending */}
              {!isFullyPaid && order.status === 'READY FOR PICKUP' && (
                <div style={{ marginTop: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>
                    YOUR OUTFIT IS READY FOR PICKUP!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.4 }}>
                    Please transfer the remaining balance of <strong>₦{balanceRemaining.toLocaleString()}</strong> to:
                    <br />
                    <strong>OPay • 8030635560 • Abdulrahman Aliyu</strong>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : cleanQuery ? (
          <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No order found matching &quot;{cleanQuery}&quot;. Please check the order reference or phone number.
          </div>
        ) : null}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link href="/order/new" style={{ color: '#6366f1', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}>
            ← Book another custom order
          </Link>
        </div>

      </div>
    </div>
  );
}