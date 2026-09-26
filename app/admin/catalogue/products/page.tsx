import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Product = {
  id: string;
  code: string;
  name: string;
  type: string | null;
  price: number;
  is_active: boolean;
};

type Option = {
  fabric_product_id: string;
  is_active: boolean;
};

export default async function ProductsCataloguePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: products, error: productsError } = await supabase
    .from('fabric_products')
    .select('id, code, name, type, price, is_active')
    .order('created_at', { ascending: false });

  if (productsError) {
    return <main style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
      <h1>Fabric Products</h1>
      <p role="alert">Failed to load products: {productsError.message}</p>
    </main>;
  }

  const productList = (products ?? []) as Product[];
  const productIds = productList.map((product) => product.id);
  let options: Option[] = [];

  if (productIds.length > 0) {
    const { data, error } = await supabase
      .from('fabric_options')
      .select('fabric_product_id, is_active')
      .in('fabric_product_id', productIds);
    if (error) {
      return <main style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
        <h1>Fabric Products</h1>
        <p role="alert">Failed to load WhatsApp references: {error.message}</p>
      </main>;
    }
    options = (data ?? []) as Option[];
  }

  const activeOptionCounts = new Map<string, number>();
  for (const option of options) {
    if (option.is_active) {
      activeOptionCounts.set(option.fabric_product_id, (activeOptionCounts.get(option.fabric_product_id) ?? 0) + 1);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 30 }}>
        <div>
          <Link href="/admin/catalogue">← Old Catalogue</Link>
          <h1 style={{ margin: '15px 0 8px' }}>Fabric Products</h1>
          <p style={{ margin: 0, color: '#666' }}>Manage products and their WhatsApp picture references.</p>
        </div>
        <Link href="/admin/catalogue/products/new" style={{ padding: '12px 18px', borderRadius: 9, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
          + Add New Product
        </Link>
      </header>

      {productList.length === 0 ? (
        <section style={{ padding: '50px 20px', textAlign: 'center', border: '1px solid #ddd', borderRadius: 14 }}>
          <h2>No fabric products yet</h2>
          <p style={{ color: '#666' }}>Add your first fabric product and WhatsApp references.</p>
          <Link href="/admin/catalogue/products/new">Add First Product</Link>
        </section>
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {productList.map((product) => {
            const count = activeOptionCounts.get(product.id) ?? 0;
            return (
              <article key={product.id} style={{ border: '1px solid #ddd', borderRadius: 14, padding: 18, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>{product.name}</h2>
                  <span style={{ fontSize: 12, padding: '5px 8px', borderRadius: 20, background: product.is_active ? '#eaf7ea' : '#eee', color: product.is_active ? '#176b17' : '#666' }}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={{ color: '#555', marginBottom: 6 }}><strong>Code:</strong> {product.code}</p>
                <p style={{ color: '#666', margin: '6px 0' }}><strong>Fabric Type:</strong> {product.type || 'Not specified'}</p>
                <p style={{ margin: '12px 0 6px', fontSize: 20, fontWeight: 700 }}>₦{Number(product.price).toLocaleString('en-NG')}</p>
                <p style={{ margin: '5px 0', color: '#666', fontSize: 14 }}>{count} active WhatsApp {count === 1 ? 'reference' : 'references'}</p>
                <Link href={`/admin/catalogue/products/${product.id}/edit`} style={{ display: 'block', marginTop: 18, textAlign: 'center', padding: 10, border: '1px solid #ccc', borderRadius: 8, textDecoration: 'none', color: '#111' }}>
                  Manage / Edit
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
