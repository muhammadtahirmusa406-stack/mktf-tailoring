'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateShopOrderStatusAction(formData: FormData): Promise<void> {
  const orderRef = (formData.get('orderRef') as string || '').trim();
  const nextStatus = (formData.get('status') as string || '').trim();

  if (!orderRef || !nextStatus) return;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: shop } = await supabase
    .from('child_shops')
    .select('id')
    .eq('owner_profile_id', user.id)
    .single();

  if (!shop) return;

  await supabase
    .from('orders')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('order_reference', orderRef)
    .eq('child_shop_id', shop.id);

  revalidatePath('/shop/dashboard');
  revalidatePath('/admin/orders');
}
