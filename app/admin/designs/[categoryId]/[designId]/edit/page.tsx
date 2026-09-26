import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DesignForm from '../../../DesignForm';

type Props = { params: Promise<{ categoryId: string; designId: string }> };

export default async function EditDesignPage({ params }: Props) {
  const { categoryId, designId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: category, error: categoryError } = await supabase.from('design_categories').select('id, name').eq('id', categoryId).maybeSingle();
  const { data: design, error: designError } = await supabase.from('design_items')
    .select('id, category_id, name, description, image_path, display_order, is_active')
    .eq('id', designId).eq('category_id', categoryId).maybeSingle();

  if (!category && !categoryError) notFound();
  if (!design && !designError) notFound();

  let signedUrl: string | null = null;
  let signedUrlError = '';
  if (design?.image_path) {
    const { data, error } = await supabase.storage.from('designs').createSignedUrl(design.image_path, 60 * 60);
    signedUrl = data?.signedUrl ?? null;
    signedUrlError = error?.message ?? '';
  }

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: 20 }}>
      <Link href={`/admin/designs/${categoryId}`}>← Back to {(category as { name: string } | null)?.name ?? 'category'}</Link>
      <h1 style={{ marginBottom: 6 }}>Edit Design</h1>
      {categoryError ? <p role="alert" style={{ color: '#a32121' }}>Could not load category: {categoryError.message}</p> : null}
      {designError ? <p role="alert" style={{ color: '#a32121' }}>Could not load design: {designError.message}</p> : null}
      {design && !designError ? <>
        {signedUrlError && <p role="status" style={{ color: '#8a5a00' }}>Image preview is unavailable. You can still replace the image.</p>}
        <DesignForm categoryId={categoryId} design={design} initialSignedUrl={signedUrl} />
      </> : null}
    </main>
  );
}
