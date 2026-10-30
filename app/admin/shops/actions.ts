'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function approveShopApplicationAction(formData: FormData) {
  const shopId = formData.get('shopId') as string;
  const ownerProfileId = formData.get('ownerProfileId') as string;

  if (!shopId || !ownerProfileId) {
    console.error('approveShopApplicationAction: Missing shopId or ownerProfileId');
    return;
  }

  const supabase = await createClient();

  // Verify current actor is admin
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Action performed by user:', user?.id, user?.email);

  // 1. Activate workshop
  const { error: shopError } = await supabase
    .from('child_shops')
    .update({ status: 'active' })
    .eq('id', shopId);

  if (shopError) {
    console.error('Error activating shop in Supabase:', shopError.message);
    throw new Error(`Failed to activate workshop: ${shopError.message}`);
  }

  // 2. Elevate user role to child_shop
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'child_shop', is_active: true })
    .eq('id', ownerProfileId);

  if (profileError) {
    console.error('Error elevating profile in Supabase:', profileError.message);
  }

  console.log(`Successfully approved shop: ${shopId}`);
  revalidatePath('/admin/shops');
  revalidatePath('/partner/status');
  revalidatePath('/shop/dashboard');
}

export async function rejectShopApplicationAction(formData: FormData) {
  const shopId = formData.get('shopId') as string;

  if (!shopId) {
    console.error('rejectShopApplicationAction: Missing shopId');
    return;
  }

  const supabase = await createClient();

  // Find owner first so we can reset their profile role
  const { data: shop, error: fetchErr } = await supabase
    .from('child_shops')
    .select('owner_profile_id')
    .eq('id', shopId)
    .single();

  if (fetchErr) {
    console.error('Error fetching shop prior to reject:', fetchErr.message);
  }

  // Detach any orders first
  await supabase
    .from('orders')
    .update({ child_shop_id: null })
    .eq('child_shop_id', shopId);

  // Delete the shop record
  const { error: delError } = await supabase
    .from('child_shops')
    .delete()
    .eq('id', shopId);

  if (delError) {
    console.error('Error deleting shop in Supabase:', delError.message);
    throw new Error(`Failed to decline application: ${delError.message}`);
  }

  // Reset applicant profile role to customer
  if (shop?.owner_profile_id) {
    await supabase
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', shop.owner_profile_id);
  }

  console.log(`Successfully declined and removed shop application: ${shopId}`);
  revalidatePath('/admin/shops');
  revalidatePath('/partner/apply');
  revalidatePath('/partner/status');
}

export async function toggleShopStatusAction(formData: FormData) {
  const shopId = formData.get('shopId') as string;
  const currentStatus = formData.get('currentStatus') as string;

  if (!shopId) return;

  const supabase = await createClient();
  const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

  const { error } = await supabase
    .from('child_shops')
    .update({ status: nextStatus })
    .eq('id', shopId);

  if (error) {
    console.error('Error toggling shop status:', error.message);
  }

  revalidatePath('/admin/shops');
}