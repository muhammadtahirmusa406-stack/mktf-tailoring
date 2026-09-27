import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ categoryId: string }> };
type Category = { id: string; name: string; is_active: boolean };
type Design = { id: string; reference_code: string | null; name: string; description: string | null; image_path: string | null; display_order: number; is_active: boolean };

export default async function DesignCategoryPage({ params }: Props) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: category, error: categoryError } = await supabase.from('design_categories')
    .select('id, name, is_active').eq('id', categoryId).maybeSingle();
  if (!category && !categoryError) notFound();

  const { data: designs, error: designsError } = category
    ? await supabase.from('design_items').select('id, reference_code, name, description, image_path, display_order, is_active')
      .eq('category_id', categoryId).order('display_order', { ascending: true }).order('created_at', { ascending: false })
    : { data: null, error: null };

  const designList = (designs ?? []) as Design[];
  const paths = designList.map((design) => design.image_path).filter((path): path is string => Boolean(path));
  const signedUrlByPath = new Map<string, string>();
  let imageError = '';
  if (paths.length) {
    const { data, error } = await supabase.storage.from('designs').createSignedUrls(paths, 60 * 60);
    if (error) imageError = error.message;
    data?.forEach((result, index) => {
      if (result?.signedUrl) signedUrlByPath.set(paths[index], result.signedUrl);
    });
  }

  return (
    <main style={{ maxWidth: 1200, margin: '40px auto', padding: 20 }}>
      <Link href="/admin/designs">← All categories</Link>
      {categoryError ? (
        <p role="alert" style={{ color: '#a32121' }}>Could not load category: {categoryError.message}</p>
      ) : category ? (
        <>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', margin: '18px 0 24px' }}>
            <div>
              <h1 style={{ margin: 0 }}>{(category as Category).name}</h1>
              <p style={{ color: '#666', margin: '6px 0 0' }}>{designList.length} {designList.length === 1 ? 'design' : 'designs'}</p>
            </div>
            {(category as Category).is_active && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={`/admin/designs/${categoryId}/bulk`} style={primaryButton}>+ Add Designs</Link>
                <Link href={`/admin/designs/${categoryId}/new`} style={secondaryButton}>Add one design</Link>
              </div>
            )}
          </header>
          {designsError && <p role="alert" style={{ color: '#a32121' }}>Could not load designs: {designsError.message}</p>}
          {imageError && <p role="alert" style={{ color: '#a32121' }}>Some design images could not be loaded: {imageError}</p>}
          {!designsError && designList.length === 0 ? (
            <section style={{ padding: 40, textAlign: 'center', border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
              <h2>No designs in this category yet</h2>
              <p style={{ color: '#666' }}>Add a design image to get started.</p>
              {(category as Category).is_active && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Link href={`/admin/designs/${categoryId}/bulk`} style={primaryButton}>Add Designs</Link>
                  <Link href={`/admin/designs/${categoryId}/new`} style={secondaryButton}>Add one design</Link>
                </div>
              )}
            </section>
          ) : (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
              {designList.map((design) => {
                const imageUrl = design.image_path ? signedUrlByPath.get(design.image_path) : undefined;
                return (
                  <article key={design.id} style={{ overflow: 'hidden', border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
                    <div style={{ position: 'relative', height: 260, background: '#f3f3f3' }}>
                      {imageUrl ? <Image src={imageUrl} alt={design.name} fill unoptimized style={{ objectFit: 'cover' }} /> :
                        <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 12, color: '#777', textAlign: 'center' }}>{design.image_path ? 'Image unavailable' : 'No image'}</div>}
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                      <h2 style={{ margin: 0, fontSize: 18 }}>{design.name}</h2>
                        <span style={{ padding: '4px 7px', borderRadius: 16, background: design.is_active ? '#eaf7ea' : '#eee', color: design.is_active ? '#176b17' : '#666', fontSize: 12 }}>{design.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      {design.reference_code && <p style={{ margin: '8px 0 0', color: '#176b4d', fontSize: 14, fontWeight: 700 }}>{design.reference_code}</p>}
                      {design.description && <p style={{ color: '#666', lineHeight: 1.45 }}>{design.description}</p>}
                      <Link href={`/admin/designs/${categoryId}/${design.id}/edit`} style={{ display: 'block', marginTop: 14, padding: 10, border: '1px solid #ccc', borderRadius: 8, textAlign: 'center', color: '#111', textDecoration: 'none' }}>Edit design</Link>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}

const primaryButton = { display: 'inline-block', padding: '12px 18px', borderRadius: 9, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 } as const;
const secondaryButton = { display: 'inline-block', padding: '12px 18px', border: '1px solid #ccc', borderRadius: 9, background: '#fff', color: '#111', textDecoration: 'none', fontWeight: 600 } as const;
