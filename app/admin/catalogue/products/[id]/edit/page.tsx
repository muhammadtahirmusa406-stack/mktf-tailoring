import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditProductForm from './EditProductForm';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') redirect('/dashboard');

  const { data: product, error: productError } = await supabase
    .from('fabric_products')
    .select('id, code, name, type, description, price, is_active')
    .eq('id', id)
    .maybeSingle();
  if (!product && !productError) notFound();

  const { data: options, error: optionsError } = await supabase
    .from('fabric_options')
    .select('id, reference_code, display_name, display_order, is_active')
    .eq('fabric_product_id', id)
    .order('display_order', { ascending: true });

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
      <Link href="/admin/catalogue/products">← Back to Fabric Products</Link>
      <h1 style={{ marginBottom: 8 }}>Manage Fabric Product</h1>
      <p style={{ color: '#666', marginTop: 0 }}>Edit product details and manage WhatsApp picture references.</p>
      {productError ? (
        <p role="alert" style={{ color: '#b00020' }}>Could not load product: {productError.message}</p>
      ) : optionsError ? (
        <p role="alert" style={{ color: '#b00020' }}>Could not load references: {optionsError.message}</p>
      ) : product ? (
        <EditProductForm product={product} options={options ?? []} />
      ) : null}
    </main>
  );
}
