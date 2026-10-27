import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { ref } = await searchParams;
  const orderRef = typeof ref === 'string' ? ref.trim() : '';

  let orderData: {
    customer_name?: string | null;
    fabric_name_at_order?: string | null;
    design_reference_at_order?: string | null;
    sewing_style_name_at_order?: string | null;
    total_price_at_order?: number | null;
  } | null = null;

  if (orderRef) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('orders')
      .select('customer_name, fabric_name_at_order, design_reference_at_order, sewing_style_name_at_order, total_price_at_order')
      .eq('order_reference', orderRef)
      .maybeSingle();
    orderData = data;
  }

  return (
    <main style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', background: '#f7f8f7' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: 32, border: '1px solid #dfe7e2', borderRadius: 16, background: '#fff', textAlign: 'center', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e4f5ec', color: '#176b4d', fontSize: 26, fontWeight: 800, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          ✓
        </div>
        <p style={{ margin: 0, color: '#176b4d', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Order Confirmed
        </p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 24, color: '#1f2937', fontWeight: 800 }}>
          Thank you{orderData?.customer_name ? ', ' + orderData.customer_name : ''}!
        </h1>
        <p style={{ margin: '0 0 20px', color: '#4b5563', lineHeight: 1.5, fontSize: 14 }}>
          Your order has been recorded with authoritative pricing and measurements.
        </p>
        <div style={{ background: '#f2f8f4', border: '1px dashed #176b4d', padding: 16, borderRadius: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#176b4d', textTransform: 'uppercase', fontWeight: 700 }}>Order Reference</span>
          <strong style={{ display: 'block', fontSize: 24, letterSpacing: '0.06em', color: '#111827', marginTop: 4 }}>
            {orderRef || 'Pending Reference'}
          </strong>
        </div>
        {orderData && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 10, textAlign: 'left', fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#4b5563' }}>Fabric:</span>
              <strong style={{ color: '#111827' }}>{orderData.fabric_name_at_order}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#4b5563' }}>Design Reference:</span>
              <strong style={{ color: '#111827' }}>{orderData.design_reference_at_order}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#4b5563' }}>Sewing Style:</span>
              <strong style={{ color: '#111827' }}>{orderData.sewing_style_name_at_order}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '2px solid #e5e7eb', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>Total Authoritative Price:</span>
              <strong style={{ fontSize: 18, color: '#176b4d' }}>
                ₦{Number(orderData.total_price_at_order ?? 0).toLocaleString('en-NG')}
              </strong>
            </div>
          </div>
        )}
        <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            Keep your order reference safe. You can track your order status anytime.
          </p>
          <Link href="/" style={{ display: 'block', width: '100%', padding: '13px', background: '#176b4d', color: '#fff', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
