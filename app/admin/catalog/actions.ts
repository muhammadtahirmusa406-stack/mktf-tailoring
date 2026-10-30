'use server';

import { createClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';

// 1. Add or Update Single Sewing Cut / Style (Upsert on name)
export async function addSewingStyleAction(formData: FormData) {
  const supabase = await createClient();

  const name = (formData.get('name') as string)?.trim() || 'Custom Style';
  const sewing_charge = parseFloat(formData.get('base_price') as string) || 0;
  const description = (formData.get('description') as string)?.trim() || '';
  const file = formData.get('image') as File | null;

  let imageUrl: string | null = null;

  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `styles/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('catalog')
      .upload(fileName, file, { upsert: true });

    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabase.storage
        .from('catalog')
        .getPublicUrl(uploadData.path);
      imageUrl = publicUrl;
    } else if (uploadError) {
      console.error('Style image upload failed:', uploadError.message);
    }
  }

  // Build payload
  const stylePayload: any = {
    name,
    sewing_charge,
    base_price: sewing_charge,
    description,
    is_active: true,
  };

  if (imageUrl) {
    stylePayload.image_url = imageUrl;
  }

  // Upsert resolves duplicate name conflicts automatically
  const { error: upsertError } = await supabase
    .from('sewing_styles')
    .upsert(stylePayload, { onConflict: 'name' });

  if (upsertError) {
    console.error('Failed to save sewing style:', upsertError.message);
    throw new Error(upsertError.message);
  }

  revalidatePath('/admin/catalog');
  revalidatePath('/order/new');
  revalidatePath('/catalog');
}

// 2. Add Batch of Embroidery Designs
export async function addDesignBatchAction(formData: FormData) {
  const supabase = await createClient();

  const category = (formData.get('category') as string)?.trim() || 'General';
  const codePrefix = ((formData.get('code_prefix') as string)?.trim() || 'DES').toUpperCase();
  const price = parseFloat(formData.get('base_price') as string) || 0;
  const files = formData.getAll('images') as File[];

  if (!files || files.length === 0) return;

  const recordsToInsert = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `designs/${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catalog')
        .upload(fileName, file, { upsert: true });

      let publicUrl: string | null = null;
      if (!uploadError && uploadData) {
        const urlObj = supabase.storage.from('catalog').getPublicUrl(uploadData.path);
        publicUrl = urlObj.data.publicUrl;
      } else if (uploadError) {
        console.error(`Design upload failed for file #${i}:`, uploadError.message);
      }

      const itemCode = `${codePrefix}-${String(i + 1).padStart(3, '0')}`;

      recordsToInsert.push({
        name: `${category} ${itemCode}`,
        code: itemCode,
        price,
        category,
        category_name: category,
        image_url: publicUrl,
        is_active: true,
      });
    }
  }

  if (recordsToInsert.length > 0) {
    const { error: insertBatchError } = await supabase
      .from('embroidery_designs')
      .upsert(recordsToInsert, { onConflict: 'code' });

    if (insertBatchError) {
      console.error('Failed to insert designs batch:', insertBatchError.message);
      throw new Error(insertBatchError.message);
    }
  }

  revalidatePath('/admin/catalog');
  revalidatePath('/order/new');
  revalidatePath('/catalog');
}

export const uploadSewingStyleAction = addSewingStyleAction;