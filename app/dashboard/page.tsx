import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main style={{ maxWidth: '800px', margin: '60px auto', padding: '20px' }}>
      <h1>Customer Dashboard</h1>

      <p>Welcome to your tailoring dashboard.</p>

      <p>
        Logged in as: <strong>{user.email}</strong>
      </p>

      <LogoutButton />
    </main>
  );
}