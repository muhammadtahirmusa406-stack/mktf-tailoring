import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminCataloguePage() {
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

  const { data: fabrics, error } = await supabase
    .from('fabrics')
    .select('id, name, colour, type, price, quantity, image_url, is_active')
    .order('name');

  if (error) {
    return (
      <main
        style={{
          maxWidth: '1100px',
          margin: '60px auto',
          padding: '20px',
        }}
      >
        <h1>Catalogue Management</h1>
        <p>Unable to load the fabric catalogue.</p>
      </main>
    );
  }

  const fabricsWithImages = await Promise.all(
    (fabrics ?? []).map(async (fabric) => {
      if (!fabric.image_url) {
        return {
          ...fabric,
          signedImageUrl: null,
        };
      }

      const { data: signedUrlData } = await supabase.storage
        .from('fabrics')
        .createSignedUrl(fabric.image_url, 3600);

      return {
        ...fabric,
        signedImageUrl: signedUrlData?.signedUrl ?? null,
      };
    })
  );

  return (
    <main
      style={{
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '20px',
      }}
    >
      <Link href="/dashboard">← Back to Dashboard</Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '30px',
          marginBottom: '30px',
        }}
      >
        <div>
          <h1>Catalogue Management</h1>
          <p>Manage the fabrics available to customers.</p>
        </div>

        <Link href="/admin/catalogue/new">
          <button type="button">+ Add Fabric</button>
        </Link>
      </div>

      {fabricsWithImages.length === 0 ? (
        <div
          style={{
            padding: '40px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h2>No fabrics yet</h2>
          <p>
            Add your first fabric to start building the customer catalogue.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px',
          }}
        >
          {fabricsWithImages.map((fabric) => (
            <div
              key={fabric.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              {fabric.signedImageUrl ? (
                <Image
                  src={fabric.signedImageUrl}
                  alt={fabric.name}
                  width={500}
                  height={360}
                  unoptimized
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f3f3f3',
                    borderRadius: '8px',
                  }}
                >
                  No image
                </div>
              )}

              <h2>{fabric.name}</h2>

              <p>
                <strong>Colour:</strong>{' '}
                {fabric.colour || 'Not specified'}
              </p>

              <p>
                <strong>Type:</strong>{' '}
                {fabric.type || 'Not specified'}
              </p>

              <p>
                <strong>Price:</strong> ₦{fabric.price ?? 0}
              </p>

              <p>
                <strong>Quantity:</strong> {fabric.quantity ?? 0}
              </p>

              <p>
                <strong>Status:</strong>{' '}
                {fabric.is_active ? 'Active' : 'Inactive'}
              </p>

              <div style={{ marginTop: '15px' }}>
                <Link href={`/admin/catalogue/${fabric.id}/edit`}>
                  <button type="button">Edit Fabric</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}