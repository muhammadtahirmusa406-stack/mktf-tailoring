'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export type SubmitOrderState = { error?: string; fieldErrors?: { name?: string; phone?: string; }; };
export async function submitOrderAction(prevState: SubmitOrderState, formData: FormData): Promise<SubmitOrderState> {
  const customerName = ((formData.get('customerName') as string) || '').trim();
  const customerPhone = ((formData.get('customerPhone') as string) || '').trim();
  const fabricReference = ((formData.get('fabricReference') as string) || '').trim();
  const designReference = ((formData.get('designReference') as string) || '').trim();
  const sewingStyleId = ((formData.get('sewingStyleId') as string) || '').trim();
  const measurementsJson = ((formData.get('measurementsJson') as string) || '{}').trim();
  const fieldErrors: { name?: string; phone?: string } = {};
  if (customerName.length < 2) {
    fieldErrors.name = 'Please provide your full name (at least 2 letters).';
  }
  if (!/^0[789][01]\d{4}\d{4}$|^(\\+?234)[789][01]\d{4}\d{4}$|^\d{8,14}$/.test(customerPhone.replace(/\s+/g, ''))) {
    fieldErrors.phone = 'Please provide a valid phone number.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }
  let measurements: Record<string, number> = {};
  try {
    measurements = JSON.parse(measurementsJson);
  } catch {
    return { error: 'Invalid measurements payload.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_authoritative_order', {
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_fabric_reference: fabricReference,
    p_design_reference: designReference,
    p_sewing_style_id: sewingStyleId,
    p_measurements: measurements,
  });
  if (error || !data || data.length === 0) {
    return { error: error ? error.message : 'We could not place your order. Please review your selections and try again.' };
  }
  const created = data[0];
  redirect('/order/success?ref=' + encodeURIComponent(created.order_ref));
}
