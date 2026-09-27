import type { createClient } from '@/lib/supabase/client';

type SupabaseClient = ReturnType<typeof createClient>;

type NewDesign = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  imagePath: string;
  displayOrder: number;
  isActive?: boolean;
};

const categoryPrefixes: Record<string, string> = {
  morocco: 'MOR',
  monogram: 'MON',
  plain: 'PLA',
  'aikin hannu': 'AIK',
  embroidery: 'EMB',
};

export function getDesignReferencePrefix(categoryName: string) {
  return categoryPrefixes[categoryName.trim().toLowerCase()] ?? 'DES';
}

function formatReference(prefix: string, number: number) {
  return `${prefix}-${String(number).padStart(3, '0')}`;
}

function isReferenceConflict(error: { code?: string; message: string; details?: string | null; hint?: string | null }) {
  const description = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return error.code === '23505' && description.includes('reference_code');
}

export async function createDesignWithReference(supabase: SupabaseClient, design: NewDesign) {
  const prefix = getDesignReferencePrefix(design.categoryName);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const references: string[] = [];
    const pageSize = 500;
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.from('design_items')
        .select('reference_code')
        .order('reference_code', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(`Could not determine the next design reference: ${error.message}`);

      references.push(...(data ?? []).map((row) => row.reference_code).filter((code): code is string => typeof code === 'string'));
      if ((data?.length ?? 0) < pageSize) break;
      offset += pageSize;
    }

    const prefixPattern = new RegExp(`^${prefix}-(\\d+)$`);
    const nextNumber = references.reduce((highest, reference) => {
      const match = prefixPattern.exec(reference);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    const referenceCode = formatReference(prefix, nextNumber);

    const { error } = await supabase.from('design_items').insert({
      id: design.id,
      category_id: design.categoryId,
      name: design.name,
      description: design.description,
      image_path: design.imagePath,
      display_order: design.displayOrder,
      is_active: design.isActive ?? true,
      reference_code: referenceCode,
    });

    if (!error) return referenceCode;
    if (!isReferenceConflict(error)) throw new Error(`Could not save design: ${error.message}`);

    await new Promise((resolve) => setTimeout(resolve, 30 + Math.floor(Math.random() * 120)));
  }

  throw new Error('Another design was assigned the same reference. Please try again.');
}
