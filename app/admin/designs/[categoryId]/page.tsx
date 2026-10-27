import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CategoryPriceGroups from './CategoryPriceGroups';

type Props = { params: Promise<{ categoryId: string }> };
type Category = { id: string; name: string; is_active: boolean };
type Design = { id: string; reference_code: string | null; name: string; description: string | null; image_path: string | null; display_order: number; is_active: boolean; price_group_id: string | null };

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
    ? await supabase.from('design_items').select('id, reference_code, name, description, image_path, display_order, is_active, price_group_id')
      .eq('category_id', categoryId).order('display_order', { ascending: true }).order('created_at', { ascending: false })
    : { data: null, error: null };

  const designList = (designs ?? []) as Design[];
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
                <Link href={`/admin/designs/${categoryId}/bulk`} style={secondaryButton}>Add ungrouped designs</Link>
                <Link href={`/admin/designs/${categoryId}/new`} style={secondaryButton}>Add one ungrouped design</Link>
              </div>
            )}
          </header>
          {designsError && <p role="alert" style={{ color: '#a32121' }}>Could not load designs: {designsError.message}</p>}
          {!designsError && <CategoryPriceGroups categoryId={categoryId} categoryName={(category as Category).name} initialDesigns={designList} />}
        </>
      ) : null}
    </main>
  );
}

const secondaryButton = { display: 'inline-block', padding: '12px 18px', border: '1px solid #ccc', borderRadius: 9, background: '#fff', color: '#111', textDecoration: 'none', fontWeight: 600 } as const;
