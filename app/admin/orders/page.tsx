import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import OrdersListClient from './OrdersListClient';

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_OPTIONS = [
  'NEW',
  'CONFIRMED',
  'ASSIGNED',
  'IN PRODUCTION',
  'READY',
  'DELIVERED',
];

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status: filterStatus } = await searchParams;
  const rawFilter = (filterStatus || 'ALL').trim().toUpperCase();

  const supabase = await createClient();

  const { data: allOrders = [] } = await supabase
    .from('orders')
    .select(`
      id,
      order_reference,
      customer_name,
      customer_phone,
      status,
      fabric_name_at_order,
      fabric_reference_at_order,
      design_reference_at_order,
      design_name_at_order,
      sewing_style_name_at_order,
      total_price_at_order,
      measurements,
      created_at
    `)
    .order('created_at', { ascending: false });

  const normalize = (val: string) => val.replace(/[\s_]+/g, ' ').toUpperCase();

  const filteredOrders = (allOrders || []).filter((ord) => {
    if (rawFilter === 'ALL') return true;
    return normalize(ord.status) === normalize(rawFilter);
  });

  const counts = (allOrders || []).reduce<Record<string, number>>((acc, ord) => {
    const key = normalize(ord.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '32px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: '#111827', fontWeight: 800 }}>Tailor Workshop Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              Fast workflow actions: batch-select multiple orders or use 1-click stage advancement.
            </p>
          </div>
          <Link
            href="/order?fabric=ML-TEST-001-A"
            style={{
              padding: '10px 16px',
              background: '#176b4d',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            + New Customer Order
          </Link>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
          <Link
            href="/admin/orders"
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
              background: rawFilter === 'ALL' ? '#176b4d' : '#fff',
              color: rawFilter === 'ALL' ? '#fff' : '#4b5563',
              border: '1px solid #e5e7eb',
              whiteSpace: 'nowrap',
            }}
          >
            All ({allOrders?.length || 0})
          </Link>
          {STATUS_OPTIONS.map((st) => {
            const count = counts[normalize(st)] || 0;
            const isSelected = normalize(rawFilter) === normalize(st);
            return (
              <Link
                key={st}
                href={`/admin/orders?status=${encodeURIComponent(st)}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  background: isSelected ? '#176b4d' : '#fff',
                  color: isSelected ? '#fff' : '#4b5563',
                  border: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                }}
              >
                {st} ({count})
              </Link>
            );
          })}
        </div>

        {/* Client Component with Bulk Updates and Fast Actions */}
        {filteredOrders.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 48, textAlign: 'center', color: '#6b7280' }}>
            <p style={{ margin: 0, fontSize: 16 }}>No orders found under &quot;{rawFilter}&quot;.</p>
          </div>
        ) : (
          <OrdersListClient orders={filteredOrders} />
        )}

      </div>
    </main>
  );
}
