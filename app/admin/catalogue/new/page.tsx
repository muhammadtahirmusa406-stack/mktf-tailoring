import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AddFabricForm from './AddFabricForm';

export default async function AddFabricPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <main
      style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: '20px',
      }}
    >
      <Link href="/admin/catalogue">← Back to Catalogue</Link>

      <h1 style={{ marginTop: '30px' }}>Add Fabric</h1>

      <p>
        Add a fabric to the catalogue so customers can see and choose it
        when creating an order.
      </p>

      <AddFabricForm />
    </main>
  );
}
