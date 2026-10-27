'use server';

import { createClient } from '@/lib/supabase/server';
import { createDesignsWithReferences } from '../designReferences';

type UploadedDesignInput = { imagePath: string; name: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Please sign in again to manage designs.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError || profile?.role !== 'admin') throw new Error('Only an admin can manage designs.');
  return { supabase, user };
}

export async function createPriceGroup(categoryId: string, sewingStyleId: string, price: number) {
  if (typeof categoryId !== 'string' || !categoryId || typeof sewingStyleId !== 'string' || !sewingStyleId) {
    throw new Error('Choose a valid design category and sewing style.');
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) throw new Error('Enter a valid non-negative price.');
  const { supabase } = await requireAdmin();

  const [categoryResult, styleResult] = await Promise.all([
    supabase.from('design_categories').select('id, name, is_active').eq('id', categoryId).maybeSingle(),
    supabase.from('sewing_styles').select('id, name, is_active').eq('id', sewingStyleId).maybeSingle(),
  ]);
  if (categoryResult.error) throw new Error(`Could not verify the design category: ${categoryResult.error.message}`);
  if (!categoryResult.data?.is_active) throw new Error('This design category is unavailable.');
  if (styleResult.error) throw new Error(`Could not verify the sewing style: ${styleResult.error.message}`);
  if (!styleResult.data?.is_active) throw new Error('This sewing style is unavailable.');

  const { data: lastGroup, error: orderError } = await supabase.from('design_price_groups')
    .select('display_order').eq('category_id', categoryId).eq('sewing_style_id', sewingStyleId)
    .order('display_order', { ascending: false }).limit(1).maybeSingle();
  if (orderError) throw new Error(`Could not prepare the group order: ${orderError.message}`);

  const { data, error } = await supabase.from('design_price_groups').insert({
    category_id: categoryId,
    sewing_style_id: sewingStyleId,
    price,
    display_order: (lastGroup?.display_order ?? -1) + 1,
    is_active: true,
  }).select('id, category_id, sewing_style_id, price, display_order, is_active, cover_design_item_id').single();
  if (error) throw new Error(`Could not create the price group: ${error.message}`);
  return { group: data, categoryName: categoryResult.data.name, styleName: styleResult.data.name };
}

export async function createPriceGroupDesigns(categoryId: string, sewingStyleId: string, groupId: string, designs: UploadedDesignInput[]) {
  if (!Array.isArray(designs) || !designs.length || designs.length > 100) throw new Error('Select between 1 and 100 pictures.');
  const { supabase } = await requireAdmin();
  const [categoryResult, styleResult, groupResult] = await Promise.all([
    supabase.from('design_categories').select('id, name, is_active').eq('id', categoryId).maybeSingle(),
    supabase.from('sewing_styles').select('id, is_active').eq('id', sewingStyleId).maybeSingle(),
    supabase.from('design_price_groups').select('id, category_id, sewing_style_id, is_active').eq('id', groupId).maybeSingle(),
  ]);
  const category = categoryResult.data;
  if (categoryResult.error || !category?.is_active) throw new Error('The selected design category is unavailable.');
  if (styleResult.error || !styleResult.data?.is_active) throw new Error('The selected sewing style is unavailable.');
  if (groupResult.error || !groupResult.data?.is_active || groupResult.data.category_id !== categoryId || groupResult.data.sewing_style_id !== sewingStyleId) {
    throw new Error('The selected price group does not belong to this active category and sewing style.');
  }

  const inputDesigns: Array<UploadedDesignInput & { id: string; name: string }> = [];
  for (let index = 0; index < designs.length; index += 1) {
    const input = designs[index];
    if (!input || typeof input.imagePath !== 'string' || !input.imagePath.startsWith(`${categoryId}/`) || input.imagePath.includes('..')) {
      throw new Error(`Picture ${index + 1} has an invalid uploaded image path.`);
    }
    const name = typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '';
    const designName = name || `${category.name} design ${index + 1}`;
    inputDesigns.push({ ...input, id: crypto.randomUUID(), name: designName });
  }

  let inserts: Awaited<ReturnType<typeof createDesignsWithReferences>>;
  try {
    inserts = await createDesignsWithReferences(supabase, inputDesigns.map((design, index) => ({
      id: design.id,
      categoryId,
      categoryName: category.name,
      name: design.name,
      description: null,
      imagePath: design.imagePath,
      displayOrder: index,
      priceGroupId: groupId,
    })));
  } catch (error) {
    return inputDesigns.map((design, index) => ({ index, imagePath: design.imagePath, error: error instanceof Error ? error.message : 'Could not save design records.' }));
  }
  return inserts.map((insert, index) => insert.error
    ? { index, imagePath: inputDesigns[index].imagePath, error: insert.error }
    : { index, id: insert.id, name: inputDesigns[index].name, referenceCode: insert.referenceCode, imagePath: inputDesigns[index].imagePath });
}

export async function setPriceGroupCover(categoryId: string, groupId: string, designId: string) {
  if (![categoryId, groupId, designId].every((value) => typeof value === 'string' && value.length > 0)) throw new Error('Choose a valid cover picture.');
  const { supabase } = await requireAdmin();
  const [groupResult, designResult] = await Promise.all([
    supabase.from('design_price_groups').select('id, category_id').eq('id', groupId).maybeSingle(),
    supabase.from('design_items').select('id, category_id, price_group_id').eq('id', designId).maybeSingle(),
  ]);
  if (groupResult.error || !groupResult.data || groupResult.data.category_id !== categoryId) throw new Error('The price group does not belong to this category.');
  if (designResult.error || !designResult.data || designResult.data.category_id !== categoryId || designResult.data.price_group_id !== groupId) {
    throw new Error('The cover picture must belong to the selected price group.');
  }
  const { error } = await supabase.from('design_price_groups').update({ cover_design_item_id: designId }).eq('id', groupId).eq('category_id', categoryId);
  if (error) throw new Error(`Pictures were uploaded, but the cover could not be saved: ${error.message}`);
  return { coverDesignItemId: designId };
}
