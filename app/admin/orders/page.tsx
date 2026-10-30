import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';
import OrdersProgressionClient from './orders-progression-client';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  let orders: any[] = [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to query orders:', error.message);
    }
    orders = data || [];
  } catch (err) {
    console.error('Unexpected error loading orders:', err);
    orders = [];
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '36px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              WORKSHOP PRODUCTION PIPELINE
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '4px 0', color: '#0f172a' }}>
              Order Lifecycle & Floor Manager
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Advance garments from Cutting to Pickup. Balance tracking updates in real time for clients.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/admin/catalog"
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                padding: '10px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              🎨 Catalog Studio
            </Link>
            <Link
              href="/order/new"
              target="_blank"
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                padding: '10px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              👁 View Customer Portal ↗
            </Link>
          </div>
        </div>

        <OrdersProgressionClient initialOrders={orders} />
      </div>
    </div>
  );
}