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

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '60px auto',
        padding: '20px',
      }}
    >
      <h1>My Orders</h1>

      <p>Your orders will appear here.</p>

      <p>No orders have been created yet.</p>
    </main>
  );
}