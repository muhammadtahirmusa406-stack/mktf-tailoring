import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Product = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  price: number;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
};

type ProductImage = {
  id: string;
  product_id: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
};

export default async function ProductsCataloguePage() {
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

  const { data: products, error: productsError } = await supabase
    .from('fabric_products')
    .select(
      'id, name, type, description, price, cover_image_url, is_active, created_at'
    )
    .order('created_at', { ascending: false });

  if (productsError) {
    return (
      <main style={{ maxWidth: '1100px', margin: '40px auto', padding: '20px' }}>
        <h1>Fabric Products</h1>

        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            borderRadius: '10px',
            background: '#ffecec',
            color: '#b00020',
          }}
        >
          Failed to load products: {productsError.message}
        </div>
      </main>
    );
  }

  const productList = (products ?? []) as Product[];

  const productIds = productList.map((product) => product.id);

  let images: ProductImage[] = [];

  if (productIds.length > 0) {
    const { data: imageData, error: imagesError } = await supabase
      .from('fabric_variants')
      .select(
        'id, product_id, image_url, display_order, is_active'
      )
      .in('product_id', productIds)
      .order('display_order', { ascending: true });

    if (imagesError) {
      return (
        <main
          style={{
            maxWidth: '1100px',
            margin: '40px auto',
            padding: '20px',
          }}
        >
          <h1>Fabric Products</h1>

          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              borderRadius: '10px',
              background: '#ffecec',
              color: '#b00020',
            }}
          >
            Failed to load product pictures: {imagesError.message}
          </div>
        </main>
      );
    }

    images = (imageData ?? []) as ProductImage[];
  }

  const imageCountByProduct = new Map<string, number>();

  images.forEach((image) => {
    if (!image.is_active) {
      return;
    }

    imageCountByProduct.set(
      image.product_id,
      (imageCountByProduct.get(image.product_id) ?? 0) + 1
    );
  });

  const coverUrls = new Map<string, string>();

  const coverPaths = productList
    .map((product) => product.cover_image_url)
    .filter((path): path is string => Boolean(path));

  if (coverPaths.length > 0) {
    const { data: signedImages } = await supabase.storage
      .from('fabrics')
      .createSignedUrls(coverPaths, 60 * 60);

    signedImages?.forEach((signedImage, index) => {
      const path = coverPaths[index];

      if (signedImage?.signedUrl) {
        coverUrls.set(path, signedImage.signedUrl);
      }
    });
  }

  return (
    <main
      style={{
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '30px',
        }}
      >
        <div>
          <Link href="/admin/catalogue">← Old Catalogue</Link>

          <h1 style={{ margin: '15px 0 8px' }}>Fabric Products</h1>

          <p style={{ margin: 0, color: '#666' }}>
            Manage your fabric products and their pictures.
          </p>
        </div>

        <Link
          href="/admin/catalogue/products/new"
          style={{
            display: 'inline-block',
            padding: '12px 18px',
            borderRadius: '9px',
            background: '#111',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          + Add New Product
        </Link>
      </div>

      {productList.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            border: '1px solid #ddd',
            borderRadius: '14px',
            background: '#fff',
          }}
        >
          <h2 style={{ marginTop: 0 }}>No fabric products yet</h2>

          <p style={{ color: '#666' }}>
            Add your first fabric product and upload its pictures.
          </p>

          <Link
            href="/admin/catalogue/products/new"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '11px 16px',
              borderRadius: '8px',
              background: '#111',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Add First Product
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {productList.map((product) => {
            const imageCount =
              imageCountByProduct.get(product.id) ?? 0;

            const coverUrl = product.cover_image_url
              ? coverUrls.get(product.cover_image_url)
              : null;

            return (
              <article
                key={product.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '240px',
                    background: '#f4f4f4',
                  }}
                >
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={product.name}
                      fill
                      unoptimized
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#777',
                      }}
                    >
                      No cover picture
                    </div>
                  )}
                </div>

                <div style={{ padding: '18px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '20px',
                      }}
                    >
                      {product.name}
                    </h2>

                    <span
                      style={{
                        fontSize: '12px',
                        padding: '5px 8px',
                        borderRadius: '20px',
                        background: product.is_active
                          ? '#eaf7ea'
                          : '#eee',
                        color: product.is_active
                          ? '#176b17'
                          : '#666',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {product.type && (
                    <p
                      style={{
                        margin: '8px 0',
                        color: '#666',
                      }}
                    >
                      {product.type}
                    </p>
                  )}

                  <p
                    style={{
                      margin: '12px 0 5px',
                      fontSize: '20px',
                      fontWeight: 700,
                    }}
                  >
                    ₦{product.price.toLocaleString('en-NG')}
                  </p>

                  <p
                    style={{
                      margin: '5px 0',
                      color: '#666',
                      fontSize: '14px',
                    }}
                  >
                    {imageCount}{' '}
                    {imageCount === 1 ? 'picture' : 'pictures'}
                  </p>

                  {product.description && (
                    <p
                      style={{
                        marginTop: '12px',
                        color: '#555',
                        lineHeight: 1.5,
                      }}
                    >
                      {product.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '18px',
                    }}
                  >
                    <Link
                      href={`/admin/catalogue/products/${product.id}/edit`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#111',
                      }}
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}