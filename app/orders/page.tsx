import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main
        style={{
          maxWidth: '1000px',
          margin: '60px auto',
          padding: '20px',
        }}
      >
        <h1>My Orders</h1>
        <p>Unable to load your orders.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '60px auto',
        padding: '20px',
      }}
    >
      <Link href="/dashboard">← Back to Dashboard</Link>

      <h1>My Orders</h1>

      <Link href="/orders/new">
        <button type="button">Create New Order</button>
      </Link>

      {orders.length === 0 ? (
        <p>You don&apos;t have any orders yet.</p>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order.id}>
              <p>
                <strong>Order ID:</strong> {order.id}
              </p>

              <p>
                <strong>Status:</strong> {order.status}
              </p>

              <p>
                <strong>Created:</strong>{' '}
                {new Date(order.created_at).toLocaleDateString()}
              </p>

              <hr />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}