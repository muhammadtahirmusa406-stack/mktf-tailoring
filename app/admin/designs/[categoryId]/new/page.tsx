import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DesignForm from '../../DesignForm';

type Props = { params: Promise<{ categoryId: string }> };

export default async function AddDesignPage({ params }: Props) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: category, error } = await supabase.from('design_categories').select('id, name, is_active').eq('id', categoryId).maybeSingle();
  if (!category && !error) notFound();

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: 20 }}>
      <Link href={`/admin/designs/${categoryId}`}>← Back to category</Link>
      {error ? <p role="alert" style={{ color: '#a32121' }}>Could not load category: {error.message}</p> : category ? (
        <>
          <h1 style={{ marginBottom: 6 }}>Add Design</h1>
          <p style={{ color: '#666', marginTop: 0 }}>Category: {category.name}</p>
          {category.is_active ? <DesignForm categoryId={categoryId} /> : <p role="alert">This category is inactive. Reactivate it before adding designs.</p>}
        </>
      ) : null}
    </main>
  );
}
