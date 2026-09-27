import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BulkDesignUpload from './BulkDesignUpload';

type Props = { params: Promise<{ categoryId: string }> };

export default async function BulkDesignPage({ params }: Props) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: category, error } = await supabase.from('design_categories').select('id, name, is_active').eq('id', categoryId).maybeSingle();
  if (!category && !error) notFound();

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', padding: 20 }}>
      <Link href={`/admin/designs/${categoryId}`}>← Back to category</Link>
      {error ? <p role="alert" style={{ color: '#a32121' }}>Could not load category: {error.message}</p> : category ? (
        <>
          <h1 style={{ margin: '18px 0 6px' }}>Add Designs</h1>
          <p style={{ marginTop: 0, color: '#666' }}>Category: {category.name}. Select several images, review them, then upload together.</p>
          {category.is_active ? <BulkDesignUpload categoryId={categoryId} categoryName={category.name} /> : <p role="alert">This category is inactive. Reactivate it before adding designs.</p>}
        </>
      ) : null}
    </main>
  );
}
