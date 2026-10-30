'use server';

import { createClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
  success: boolean;
  error?: string;
};

// 1. Update Order Lifecycle Status (Callable from JS)
export async function updateOrderStatusAction(
  orderId: string,
  nextStatus: string
): Promise<ActionResult> {
  if (!orderId || !nextStatus) {
    return { success: false, error: 'Order reference and target status are required.' };
  }

  const supabase = await createClient();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, order_reference, total_price, amount_paid, payment_status')
    .or(`id.eq.${orderId},order_reference.eq.${orderId}`)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Order not found in workshop records.' };
  }

  // Delivery Gate: block COMPLETED unless 100% paid
  const normalizedStatus = nextStatus.trim().toUpperCase();
  if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'DELIVERED') {
    const balance = Number(order.total_price) - Number(order.amount_paid);
    const isPaid = order.payment_status === '100%_FULLY_PAID' || balance <= 0;

    if (!isPaid) {
      return {
        success: false,
        error: `Delivery Gate Active: Order cannot be completed until remaining balance of ₦${balance.toLocaleString()} is settled in full.`,
      };
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  revalidatePath('/staff/branch-floor');
  revalidatePath('/shop/dashboard');
  revalidatePath('/track');

  return { success: true };
}

// Form-compatible wrapper for single status updates
export async function updateOrderStatusFormAction(formData: FormData): Promise<void> {
  const orderId = ((formData.get('orderId') as string) || (formData.get('orderRef') as string) || '').trim();
  const nextStatus = ((formData.get('status') as string) || '').trim();
  if (orderId && nextStatus) {
    await updateOrderStatusAction(orderId, nextStatus);
  }
}

// 2. Confirm Final Cash Balance Payment
export async function confirmFinalPaymentAction(orderId: string, totalPrice: number): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .update({
      amount_paid: totalPrice,
      payment_status: '100%_FULLY_PAID',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  revalidatePath('/staff/branch-floor');
  revalidatePath('/shop/dashboard');
  revalidatePath('/track');

  return { success: true };
}

// 3. Assign or Transfer Order to Child Shop (Callable from JS)
export async function assignOrderToShopAction(
  orderId: string,
  shopId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) {
      return { success: false, error: 'Order reference is required.' };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .update({
        child_shop_id: shopId,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${orderId},order_reference.eq.${orderId}`);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    revalidatePath('/staff/branch-floor');
    revalidatePath('/shop/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Form-compatible wrapper for shop assignment
export async function assignOrderToShopFormAction(formData: FormData): Promise<void> {
  const orderRef = ((formData.get('orderRef') as string) || (formData.get('orderId') as string) || '').trim();
  const rawShop = formData.get('childShopId') as string;
  const shopId = rawShop && rawShop !== 'UNASSIGNED' ? rawShop.trim() : null;
  if (orderRef) {
    await assignOrderToShopAction(orderRef, shopId);
  }
}

// 4. Bulk Advance Selected Orders (Callable from JS)
export async function bulkAdvanceOrdersAction(
  orderIds: string[]
): Promise<{ success: boolean; advancedCount: number; errors: string[] }> {
  try {
    if (!orderIds || orderIds.length === 0) {
      return { success: false, advancedCount: 0, errors: ['No orders selected'] };
    }

    const supabase = await createClient();
    const STAGES_SEQUENCE = ['NEW', 'CUTTING', 'EMBROIDERY', 'SEWING', 'READY FOR PICKUP', 'COMPLETED'];

    const { data: orders, error: fetchErr } = await supabase
      .from('orders')
      .select('id, order_reference, status, total_price, amount_paid, payment_status')
      .in('id', orderIds);

    if (fetchErr || !orders) {
      return { success: false, advancedCount: 0, errors: [fetchErr?.message || 'Failed to fetch orders'] };
    }

    let advancedCount = 0;
    const errors: string[] = [];

    for (const ord of orders) {
      const currentIdx = STAGES_SEQUENCE.indexOf(ord.status);
      const nextStage = STAGES_SEQUENCE[currentIdx + 1];

      if (!nextStage) {
        continue;
      }

      // Delivery Gate enforcement
      if (nextStage === 'COMPLETED' || nextStage === 'DELIVERED') {
        const balance = Number(ord.total_price) - Number(ord.amount_paid);
        const isPaid = ord.payment_status === '100%_FULLY_PAID' || balance <= 0;
        if (!isPaid) {
          errors.push(ord.order_reference + ': Delivery blocked (₦' + balance.toLocaleString() + ' unpaid)');
          continue;
        }
      }

      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: nextStage, updated_at: new Date().toISOString() })
        .eq('id', ord.id);

      if (updErr) {
        errors.push(ord.order_reference + ': ' + updErr.message);
      } else {
        advancedCount++;
      }
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    revalidatePath('/staff/branch-floor');
    revalidatePath('/shop/dashboard');
    revalidatePath('/track');

    return { success: true, advancedCount, errors };
  } catch (err: any) {
    return { success: false, advancedCount: 0, errors: [err.message] };
  }
}

// Form-compatible wrapper for bulk updates in OrdersListClient
export async function bulkUpdateOrderStatusAction(formData: FormData): Promise<void> {
  const rawRefs = (formData.get('orderRefs') as string || '').trim();
  const targetStatus = (formData.get('status') as string || '').trim();
  if (!rawRefs) return;

  const refs = rawRefs.split(',').map((r) => r.trim()).filter(Boolean);
  const supabase = await createClient();

  const { data: matchingOrders } = await supabase
    .from('orders')
    .select('id, order_reference, total_price, amount_paid, payment_status')
    .in('order_reference', refs);

  if (!matchingOrders || matchingOrders.length === 0) return;

  for (const ord of matchingOrders) {
    if (targetStatus === 'COMPLETED') {
      const balance = Number(ord.total_price) - Number(ord.amount_paid);
      const isPaid = ord.payment_status === '100%_FULLY_PAID' || balance <= 0;
      if (!isPaid) continue;
    }

    await supabase
      .from('orders')
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq('id', ord.id);
  }

  revalidatePath('/admin/orders');
  revalidatePath('/staff/branch-floor');
  revalidatePath('/admin');
  revalidatePath('/track');
}
