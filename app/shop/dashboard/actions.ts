'use server';

import { createClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';

export async function updateShopOrderStatusAction(
  orderIdOrFormData: string | FormData,
  statusArg?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let orderId = '';
    let nextStatus = '';

    if (typeof orderIdOrFormData === 'string') {
      orderId = orderIdOrFormData.trim();
      nextStatus = (statusArg || '').trim();
    } else {
      orderId = (orderIdOrFormData.get('orderId') as string || orderIdOrFormData.get('orderRef') as string || '').trim();
      nextStatus = (orderIdOrFormData.get('status') as string || '').trim();
    }

    if (!orderId || !nextStatus) {
      return { success: false, error: 'Order ID and status are required' };
    }

    const supabase = await createClient();

    // 1. Fetch current order details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_reference, total_price, amount_paid, payment_status, child_shop_id')
      .or(`id.eq.${orderId},order_reference.eq.${orderId}`)
      .single();

    if (orderErr || !order) {
      return { success: false, error: 'Order not found in workshop records' };
    }

    // 2. Financial delivery gate check
    const normalizedStatus = nextStatus.trim().toUpperCase();
    if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'DELIVERED') {
      const balance = Number(order.total_price) - Number(order.amount_paid);
      const isPaid = order.payment_status === '100%_FULLY_PAID' || balance <= 0;

      if (!isPaid) {
        return {
          success: false,
          error: `Handover locked: Outstanding balance of ₦${balance.toLocaleString()} must be settled first.`
        };
      }
    }

    // 3. Update status
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath('/shop/dashboard');
    revalidatePath('/staff/branch-floor');
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    revalidatePath('/track');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error' };
  }
}
