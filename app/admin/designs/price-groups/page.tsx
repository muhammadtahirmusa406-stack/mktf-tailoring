import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PriceGroupManager, { type CategoryOption, type SewingStyleOption } from './PriceGroupManager';

export default async function PriceGroupsPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const [categoriesResult, stylesResult] = await Promise.all([
    supabase.from('design_categories').select('id, name').order('display_order', { ascending: true }),
    supabase.from('sewing_styles').select('id, name').eq('is_active', true).order('name', { ascending: true }),
  ]);

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/designs">← Design Management</Link>
        <h1 style={{ margin: '16px 0 6px' }}>Price Group Management</h1>
        <p style={{ margin: 0, color: '#666' }}>Manage design prices for each category and sewing style.</p>
      </div>
      <PriceGroupManager
        categories={(categoriesResult.data ?? []) as CategoryOption[]}
        styles={(stylesResult.data ?? []) as SewingStyleOption[]}
        initialLoadError={categoriesResult.error?.message ?? stylesResult.error?.message ?? ''}
      />
    </main>
  );
}
