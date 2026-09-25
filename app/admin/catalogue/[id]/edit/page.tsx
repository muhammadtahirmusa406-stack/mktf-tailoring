import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditFabricForm from './EditFabricForm';

type EditFabricPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFabricPage({
  params,
}: EditFabricPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: fabric, error } = await supabase
    .from('fabrics')
    .select('id, name, colour, type, price, quantity, image_url, is_active')
    .eq('id', id)
    .single();

  if (error || !fabric) {
    notFound();
  }

  let imageUrl: string | null = null;

  if (fabric.image_url) {
    const { data } = await supabase.storage
      .from('fabrics')
      .createSignedUrl(fabric.image_url, 3600);

    imageUrl = data?.signedUrl ?? null;
  }

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <Link href="/admin/catalogue">← Back to Catalogue</Link>

      <h1 style={{ marginTop: '30px' }}>Edit Fabric</h1>

      <p>Update the information customers will see for this fabric.</p>

      <EditFabricForm
        fabricId={fabric.id}
        initialName={fabric.name}
        initialColour={fabric.colour || ''}
        initialType={fabric.type || ''}
        initialPrice={String(fabric.price ?? '')}
        initialQuantity={String(fabric.quantity ?? '')}
        initialImageUrl={imageUrl}
        initialIsActive={fabric.is_active}
        currentImagePath={fabric.image_url}
      />
    </main>
  );
}