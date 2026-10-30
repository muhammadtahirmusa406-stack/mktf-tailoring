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
// 2. Delete Sewing Style
export async function deleteSewingStyleAction(idOrFormData: string | FormData): Promise<{ success: boolean; error?: string }> {
  try {
    let id = '';
    if (typeof idOrFormData === 'string') {
      id = idOrFormData;
    } else if (idOrFormData && typeof idOrFormData === 'object' && 'get' in idOrFormData) {
      id = (idOrFormData.get('styleId') as string) || (idOrFormData.get('id') as string) || '';
    }

    if (!id) {
      return { success: false, error: 'Style ID is required.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('sewing_styles').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/catalog');
    return { success: true };
  } catch (err: any) {
    console.error('Delete sewing style error:', err);
    return { success: false, error: err.message || 'Failed to delete sewing style' };
  }
}

// 3. Bulk Upload Files Action for Design Catalog
export async function bulkUploadFilesAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const files = formData.getAll('files') as File[];
    const category = (formData.get('category') as string) || 'EMBROIDERY';

    if (!files || files.length === 0) {
      return { success: false, error: 'No files provided for upload.' };
    }

    const uploaded = [];
    for (const file of files) {
      if (file.size === 0) continue;
      const fileExt = file.name.split('.').pop() || 'jpg';
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const path = `bulk/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('catalog')
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        console.error('File upload error:', uploadErr);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('catalog')
        .getPublicUrl(uploadData.path);

      if (category === 'STYLE') {
        const { error: insErr } = await supabase.from('sewing_styles').insert({
          name: baseName,
          image_url: publicUrl,
          sewing_charge: 15000,
          is_active: true,
        });
        if (!insErr) uploaded.push(publicUrl);
      } else {
        const { error: insErr } = await supabase.from('embroidery_designs').insert({
          name: baseName,
          image_url: publicUrl,
          price: 25000,
          code: baseName.toUpperCase().replace(/\s+/g, '-'),
          is_active: true,
        });
        if (!insErr) uploaded.push(publicUrl);
      }
    }

    revalidatePath('/admin/catalog');
    return { success: true, count: uploaded.length };
  } catch (err: any) {
    console.error('Bulk upload error:', err);
    return { success: false, error: err.message };
  }
}


// Delete Embroidery Design
export async function deleteDesignAction(idOrFormData: string | FormData): Promise<{ success: boolean; error?: string }> {
  try {
    let id = '';
    if (typeof idOrFormData === 'string') {
      id = idOrFormData;
    } else if (idOrFormData && typeof idOrFormData === 'object' && 'get' in idOrFormData) {
      id = (idOrFormData.get('designId') as string) || (idOrFormData.get('id') as string) || '';
    }

    if (!id) {
      return { success: false, error: 'Design ID is required.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('embroidery_designs').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/catalog');
    revalidatePath('/order/new');
    return { success: true };
  } catch (err: any) {
    console.error('Delete design error:', err);
    return { success: false, error: err.message || 'Failed to delete design' };
  }
}