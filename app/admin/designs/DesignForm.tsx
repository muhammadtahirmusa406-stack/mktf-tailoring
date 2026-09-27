'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createDesignWithReference } from './designReferences';

type Design = {
  id: string;
  reference_code: string | null;
  name: string;
  description: string | null;
  image_path: string | null;
  display_order: number;
  is_active: boolean;
};

type Props = {
  categoryId: string;
  categoryName: string;
  design?: Design;
  initialSignedUrl?: string | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const inputStyle = { width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8 };

async function verifyAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Please sign in again to manage designs.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') throw new Error('Only an admin can manage designs.');
}

function extensionFor(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export default function DesignForm({ categoryId, categoryName, design, initialSignedUrl }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState(design?.name ?? '');
  const [description, setDescription] = useState(design?.description ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(design?.display_order ?? 0));
  const [isActive, setIsActive] = useState(design?.is_active ?? true);
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isEditing = Boolean(design);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Enter a design name.');
      return;
    }
    if (!isEditing && !image) {
      setErrorMessage('Select an image for this design.');
      return;
    }
    if (image && !allowedTypes.includes(image.type)) {
      setErrorMessage('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (image && image.size > MAX_FILE_SIZE) {
      setErrorMessage('The image must be 5 MB or smaller.');
      return;
    }
    const order = Number(displayOrder);
    if (!Number.isInteger(order) || order < 0) {
      setErrorMessage('Display order must be a whole number of zero or higher.');
      return;
    }

    setIsSubmitting(true);
    let newImagePath: string | null = null;
    let completionMessage = isEditing ? 'Design saved successfully.' : 'Design added successfully.';
    try {
      await verifyAdmin(supabase);
      const itemId = design?.id ?? crypto.randomUUID();

      if (image) {
        newImagePath = `${categoryId}/${itemId}/${crypto.randomUUID()}.${extensionFor(image.type)}`;
        const { error: uploadError } = await supabase.storage.from('designs').upload(newImagePath, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type,
        });
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      if (design) {
        const changes: {
          name: string;
          description: string | null;
          display_order: number;
          is_active: boolean;
          image_path?: string;
        } = {
          name: name.trim(),
          description: description.trim() || null,
          display_order: order,
          is_active: isActive,
        };
        if (newImagePath) changes.image_path = newImagePath;

        const { error: updateError } = await supabase.from('design_items').update(changes).eq('id', design.id);
        if (updateError) throw new Error(`Could not save design: ${updateError.message}`);

        if (newImagePath && design.image_path) {
          const { error: removeError } = await supabase.storage.from('designs').remove([design.image_path]);
          if (removeError) {
            completionMessage = 'Design updated. The previous image could not be removed from storage.';
          }
        }
      } else {
        const referenceCode = await createDesignWithReference(supabase, {
          id: itemId,
          categoryId,
          categoryName,
          name: name.trim(),
          description: description.trim() || null,
          imagePath: newImagePath!,
          displayOrder: order,
        });
        completionMessage = `Design added successfully. Reference: ${referenceCode}`;
      }

      setSuccessMessage(completionMessage);
      setTimeout(() => {
        router.push(`/admin/designs/${categoryId}`);
        router.refresh();
      }, 1400);
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Something went wrong while saving the design.';
      if (newImagePath) {
        const { error: cleanupError } = await supabase.storage.from('designs').remove([newImagePath]);
        if (cleanupError) message += ` The new image could not be removed: ${cleanupError.message}`;
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleActiveChange(nextActive: boolean) {
    if (isActive && !nextActive && !window.confirm('Deactivate this design? It will be hidden from customers but kept in the catalogue.')) return;
    setIsActive(nextActive);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, padding: 22, border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
      {design?.reference_code && <div style={{ padding: 12, borderRadius: 8, background: '#f3f6f4' }}><span style={{ color: '#666', fontSize: 13 }}>Permanent design reference</span><strong style={{ display: 'block', marginTop: 3, fontSize: 18 }}>{design.reference_code}</strong></div>}
      {initialSignedUrl && (
        <div>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Current design image</p>
          <Image src={initialSignedUrl} alt={design?.name ?? 'Current design'} width={640} height={480} unoptimized style={{ width: '100%', maxWidth: 420, height: 260, objectFit: 'contain', borderRadius: 10, background: '#f5f5f5' }} />
        </div>
      )}

      <label><span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Design name</span><input value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} required style={inputStyle} placeholder="e.g. Moroccan collar" /></label>
      <label><span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Description <span style={{ color: '#777', fontWeight: 400 }}>(optional)</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSubmitting} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></label>
      <label><span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{isEditing ? 'Replace image (optional)' : 'Design image'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} disabled={isSubmitting} required={!isEditing} style={{ width: '100%' }} /><span style={{ display: 'block', marginTop: 6, color: '#666', fontSize: 13 }}>JPG, PNG, or WebP. Maximum size: 5 MB.</span>{image && <span style={{ display: 'block', marginTop: 6, fontSize: 14 }}>{image.name}</span>}</label>
      <label><span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Display order</span><input type="number" min="0" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} disabled={isSubmitting} style={{ ...inputStyle, maxWidth: 180 }} /></label>
      {isEditing && <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={isActive} onChange={(event) => handleActiveChange(event.target.checked)} disabled={isSubmitting} /> Design is active</label>}

      {errorMessage && <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#ffecec', color: '#a32121' }}>{errorMessage}</div>}
      {successMessage && <div role="status" style={{ padding: 12, borderRadius: 8, background: '#eaf7ea', color: '#176b17' }}>{successMessage}</div>}
      <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: 14, border: 0, borderRadius: 9, background: isSubmitting ? '#999' : '#111', color: '#fff', fontWeight: 700, cursor: isSubmitting ? 'wait' : 'pointer' }}>{isSubmitting ? 'Saving design...' : isEditing ? 'Save Changes' : 'Add Design'}</button>
    </form>
  );
}
