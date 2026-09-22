import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardNav from './DashboardNav';

export default async function DashboardPage() {
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
      <DashboardNav />

      <h1>Customer Dashboard</h1>

      <p>Welcome to your tailoring dashboard.</p>

      <p>
        Logged in as: <strong>{user.email}</strong>
      </p>

      <p>
        From here, you can manage your profile and keep track of your
        tailoring orders.
      </p>
    </main>
  );
}