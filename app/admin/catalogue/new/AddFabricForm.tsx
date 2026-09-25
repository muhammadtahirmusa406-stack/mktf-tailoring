'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AddFabricForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [colour, setColour] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      if (!name.trim()) {
        throw new Error('Please enter a fabric name.');
      }

      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new Error('Please enter a valid price.');
      }

      if (!Number.isInteger(numericQuantity) || numericQuantity < 0) {
        throw new Error('Please enter a valid quantity.');
      }

      if (image) {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowedTypes.includes(image.type)) {
          throw new Error('Please upload a JPG, PNG, or WebP image.');
        }

        if (image.size > 5 * 1024 * 1024) {
          throw new Error('Image must be smaller than 5 MB.');
        }
      }

      let imagePath: string | null = null;

      if (image) {
        const fileExtension = image.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const path = `fabrics/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fabrics')
          .upload(path, image, {
            cacheControl: '3600',
            upsert: false,
            contentType: image.type,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        imagePath = path;
      }

      const { error: insertError } = await supabase
        .from('fabrics')
        .insert({
          name: name.trim(),
          colour: colour.trim() || null,
          type: type.trim() || null,
          price: numericPrice,
          quantity: numericQuantity,
          image_url: imagePath,
          is_active: true,
        });

      if (insertError) {
        if (imagePath) {
          await supabase.storage
            .from('fabrics')
            .remove([imagePath]);
        }

        throw new Error(`Could not save fabric: ${insertError.message}`);
      }

      router.push('/admin/catalogue');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while adding the fabric.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '30px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="name">
          <strong>Fabric name</strong>
        </label>
        <br />
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Senator Material"
          required
          style={{ width: '100%', padding: '12px', marginTop: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="colour">
          <strong>Colour</strong>
        </label>
        <br />
        <input
          id="colour"
          type="text"
          value={colour}
          onChange={(event) => setColour(event.target.value)}
          placeholder="e.g. Navy Blue"
          style={{ width: '100%', padding: '12px', marginTop: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="type">
          <strong>Fabric type</strong>
        </label>
        <br />
        <input
          id="type"
          type="text"
          value={type}
          onChange={(event) => setType(event.target.value)}
          placeholder="e.g. Cotton"
          style={{ width: '100%', padding: '12px', marginTop: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="price">
          <strong>Price</strong>
        </label>
        <br />
        <input
          id="price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="e.g. 15000"
          required
          style={{ width: '100%', padding: '12px', marginTop: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="quantity">
          <strong>Quantity available</strong>
        </label>
        <br />
        <input
          id="quantity"
          type="number"
          min="0"
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="e.g. 20"
          required
          style={{ width: '100%', padding: '12px', marginTop: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="image">
          <strong>Fabric image</strong>
        </label>
        <br />
        <input
          id="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setImage(event.target.files?.[0] || null)}
          style={{ marginTop: '8px' }}
        />
        <p style={{ fontSize: '14px' }}>
          JPG, PNG or WebP. Maximum size: 5 MB.
        </p>
      </div>

      {error && (
        <p
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: '#ffe5e5',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '12px 20px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Adding Fabric...' : 'Add Fabric'}
      </button>
    </form>
  );
}
