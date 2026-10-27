'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const orderRef = (formData.get('orderRef') as string || '').trim();
  const newStatus = (formData.get('status') as string || '').trim();

  if (!orderRef || !newStatus) return;

  const supabase = await createClient();
  await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('order_reference', orderRef);

  revalidatePath('/admin/orders');
  revalidatePath('/track');
  redirect(`/admin/orders?status=${encodeURIComponent(newStatus)}`);
}

export async function bulkUpdateOrderStatusAction(formData: FormData): Promise<void> {
  const rawRefs = (formData.get('orderRefs') as string || '').trim();
  const newStatus = (formData.get('status') as string || '').trim();

  if (!rawRefs || !newStatus) return;

  const orderRefs = rawRefs.split(',').map((r) => r.trim()).filter(Boolean);
  if (orderRefs.length === 0) return;

  const supabase = await createClient();
  await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in('order_reference', orderRefs);

  revalidatePath('/admin/orders');
  revalidatePath('/track');
  redirect(`/admin/orders?status=${encodeURIComponent(newStatus)}`);
}
