import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AddProductForm from './AddProductForm';

export default async function AddProductPage() {
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
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: '30px' }}>
        <a href="/admin/catalogue">← Back to Catalogue</a>

        <h1 style={{ marginTop: '15px', marginBottom: '8px' }}>
          Add Fabric Product
        </h1>

        <p style={{ color: '#666', margin: 0 }}>
          Add one fabric product and upload all of its available pictures at
          once.
        </p>
      </div>

      <AddProductForm />
    </main>
  );
}