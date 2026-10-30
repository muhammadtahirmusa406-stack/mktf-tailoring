'use server';

import { createClient } from '@/utils/supabase-server';

export async function lookupCustomerByPhoneAction(phone: string) {
  try {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return { success: false, message: 'Invalid phone number' };
    }

    const supabase = await createClient();

    // Find the most recent order by this customer's phone number
    const { data: previousOrder, error } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, customer_measurements, order_reference, created_at')
      .eq('customer_phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error looking up customer:', error.message);
      return { success: false, message: 'Database lookup error' };
    }

    if (!previousOrder || !previousOrder.customer_measurements) {
      return { success: false, notFound: true };
    }

    return {
      success: true,
      found: true,
      customerName: previousOrder.customer_name,
      previousRef: previousOrder.order_reference,
      measurements: previousOrder.customer_measurements,
    };
  } catch (err: any) {
    console.error('Customer lookup exception:', err.message);
    return { success: false, message: err.message };
  }
}
