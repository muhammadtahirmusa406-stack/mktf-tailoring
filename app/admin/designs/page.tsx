import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Category = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

type DesignCount = { category_id: string; is_active: boolean };

export default async function AdminDesignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: categories, error: categoriesError } = await supabase
    .from('design_categories')
    .select('id, name, display_order, is_active')
    .order('display_order', { ascending: true });

  let designs: DesignCount[] = [];
  if (!categoriesError && categories?.length) {
    const { data, error } = await supabase
      .from('design_items')
      .select('category_id, is_active')
      .in('category_id', categories.map((category) => category.id));
    if (error) {
      return <main style={pageStyle}><h1>Design Management</h1><p role="alert">Could not load design counts: {error.message}</p></main>;
    }
    designs = (data ?? []) as DesignCount[];
  }

  const counts = new Map<string, number>();
  for (const design of designs) {
    if (design.is_active) counts.set(design.category_id, (counts.get(design.category_id) ?? 0) + 1);
  }

  return (
    <main style={pageStyle}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/dashboard">← Dashboard</Link>
        <h1 style={{ margin: '16px 0 6px' }}>Design Management</h1>
        <p style={{ margin: 0, color: '#666' }}>Choose a category to view and manage its designs.</p>
        <Link href="/admin/designs/price-groups" style={priceGroupLinkStyle}>Price Group Management</Link>
      </div>

      {categoriesError ? (
        <p role="alert" style={{ color: '#a32121' }}>Could not load design categories: {categoriesError.message}</p>
      ) : categories?.length ? (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {(categories as Category[]).map((category) => (
            <Link key={category.id} href={`/admin/designs/${category.id}`} style={categoryCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{category.name}</h2>
                <span style={statusStyle(category.is_active)}>{category.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <p style={{ margin: '18px 0 0', color: '#666' }}>{counts.get(category.id) ?? 0} active designs</p>
              <span style={{ display: 'block', marginTop: 18, color: '#111', fontWeight: 600 }}>Open category →</span>
            </Link>
          ))}
        </section>
      ) : (
        <p>No design categories are available.</p>
      )}
    </main>
  );
}

const pageStyle = { maxWidth: 1100, margin: '40px auto', padding: '20px' } as const;
const categoryCardStyle = { display: 'block', padding: 20, border: '1px solid #ddd', borderRadius: 14, background: '#fff', color: 'inherit', textDecoration: 'none' } as const;
const priceGroupLinkStyle = { display: 'inline-block', marginTop: 16, padding: '10px 14px', border: '1px solid #222', borderRadius: 8, color: '#111', fontWeight: 600, textDecoration: 'none' } as const;
const statusStyle = (active: boolean) => ({ padding: '5px 8px', borderRadius: 20, background: active ? '#eaf7ea' : '#eee', color: active ? '#176b17' : '#666', fontSize: 12, whiteSpace: 'nowrap' as const });
