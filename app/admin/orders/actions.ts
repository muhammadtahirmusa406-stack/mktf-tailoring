'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
  success: boolean;
  error?: string;
};

// Function overload declarations for updateOrderStatusAction
export async function updateOrderStatusAction(formData: FormData): Promise<void>;
export async function updateOrderStatusAction(orderIdOrRef: string, newStatus: string): Promise<ActionResult>;
export async function updateOrderStatusAction(
  arg1: string | FormData,
  arg2?: string
): Promise<ActionResult | void> {
  const supabase = await createClient();

  let orderIdOrRef = '';
  let newStatus = '';
  const isForm = typeof arg1 === 'object' && arg1 !== null && 'get' in arg1;

  if (isForm) {
    orderIdOrRef = (arg1.get('orderRef') as string) || (arg1.get('orderId') as string) || '';
    newStatus = (arg1.get('status') as string) || '';
  } else if (typeof arg1 === 'string') {
    orderIdOrRef = arg1;
    newStatus = arg2 || '';
  }

  if (!orderIdOrRef || !newStatus) {
    if (isForm) return;
    return { success: false, error: 'Order reference and status are required.' };
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrRef);

  let query = supabase.from('orders').update({
    status: newStatus,
    updated_at: new Date().toISOString(),
  });

  if (isUUID) {
    query = query.eq('id', orderIdOrRef);
  } else {
    query = query.eq('order_reference', orderIdOrRef);
  }

  const { error } = await query;
  if (error) {
    console.error('Failed to update status:', error.message);
    if (isForm) return;
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/staff/branch-floor');
  revalidatePath('/track');

  if (!isForm) {
    return { success: true };
  }
}

// Function overload declarations for assignOrderToShopAction
export async function assignOrderToShopAction(formData: FormData): Promise<void>;
export async function assignOrderToShopAction(orderId: string, shopId: string | null): Promise<ActionResult>;
export async function assignOrderToShopAction(
  arg1: string | FormData,
  arg2?: string | null
): Promise<ActionResult | void> {
  const supabase = await createClient();

  let orderId = '';
  let shopId: string | null = null;
  const isForm = typeof arg1 === 'object' && arg1 !== null && 'get' in arg1;

  if (isForm) {
    orderId = (arg1.get('orderId') as string) || '';
    shopId = (arg1.get('shopId') as string) || null;
  } else {
    orderId = arg1;
    shopId = arg2 ?? null;
  }

  if (!orderId) {
    if (isForm) return;
    return { success: false, error: 'Order ID is required.' };
  }

  const { error } = await supabase
    .from('orders')
    .update({
      child_shop_id: shopId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to assign shop:', error.message);
    if (isForm) return;
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  if (!isForm) {
    return { success: true };
  }
}

// Function overload declarations for bulkUpdateOrderStatusAction
export async function bulkUpdateOrderStatusAction(formData: FormData): Promise<void>;
export async function bulkUpdateOrderStatusAction(orderIds: string[], newStatus: string): Promise<ActionResult>;
export async function bulkUpdateOrderStatusAction(
  arg1: string[] | FormData,
  arg2?: string
): Promise<ActionResult | void> {
  const supabase = await createClient();

  let orderIds: string[] = [];
  let newStatus = '';
  const isForm = typeof arg1 === 'object' && arg1 !== null && 'get' in arg1;

  if (isForm) {
    const rawRefs = (arg1.get('orderRefs') as string) || (arg1.get('orderIds') as string) || '';
    orderIds = rawRefs.split(',').map((r) => r.trim()).filter(Boolean);
    newStatus = (arg1.get('status') as string) || '';
  } else if (Array.isArray(arg1)) {
    orderIds = arg1;
    newStatus = arg2 || '';
  }

  if (!orderIds || orderIds.length === 0 || !newStatus) {
    if (isForm) return;
    return { success: false, error: 'No orders or status provided.' };
  }

  const areUUIDs = orderIds.every((r) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r));

  let query = supabase.from('orders').update({
    status: newStatus,
    updated_at: new Date().toISOString(),
  });

  if (areUUIDs) {
    query = query.in('id', orderIds);
  } else {
    query = query.in('order_reference', orderIds);
  }

  const { error } = await query;
  if (error) {
    console.error('Bulk status update error:', error.message);
    if (isForm) return;
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/track');
  if (!isForm) {
    return { success: true };
  }
}

// 4. Confirm Final Payment
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
    console.error('Payment confirmation error:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/orders');
  revalidatePath('/track');
  return { success: true };
}