'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateOrderStatusAction(orderId: string, newStatus: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update status:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/track');
  return { success: true };
}

export async function confirmFinalPaymentAction(orderId: string, totalPrice: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({
      amount_paid: totalPrice,
      payment_status: '100%_FULLY_PAID',
      status: 'COMPLETED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to confirm balance payment:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/track');
  return { success: true };
}