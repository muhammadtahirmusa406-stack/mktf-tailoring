'use server';

import { createClient } from '@/utils/supabase-server';
import crypto from 'crypto';

export async function checkReturningCustomerAction(phone: string) {
  try {
    const supabase = await createClient();
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      return { found: false };
    }

    const shortPhone = cleanPhone.slice(-9);

    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .ilike('phone_number', `%${shortPhone}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { found: false };
    }

    return { found: true, profile: data };
  } catch (err) {
    return { found: false };
  }
}

export async function createNewOrderAction(orderData: {
  sewingStyleId: string;
  sewingStyleName: string;
  sewingFee: number;
  designName: string;
  designCode: string;
  embroideryFee: number;
  paymentPlan: '50_PERCENT' | '100_PERCENT';
  customerName?: string;
  customerPhone?: string;
  neckStyle?: string;
  pocketStyle?: string;
  cuffStyle?: string;
  submittedMeasurements: Record<string, number>;
}) {
  try {
    const supabase = await createClient();

    // 1. Authoritative Server Validation of Measurements against sewing_style_measurements
    const { data: configuredMeasurements, error: configError } = await supabase
      .from('sewing_style_measurements')
      .select(`
        id,
        is_required,
        display_order,
        measurement_definitions (
          id,
          name,
          hausa_name,
          key
        )
      `)
      .eq('sewing_style_id', orderData.sewingStyleId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (configError || !configuredMeasurements || configuredMeasurements.length === 0) {
      return { success: false, error: 'Configured measurements for this garment could not be verified.' };
    }

    const measurementsToInsert: Array<{
      measurement_definition_id: string;
      measurement_name_at_order: string;
      value: number;
    }> = [];

    for (const item of configuredMeasurements) {
      const def: any = item.measurement_definitions;
      if (!def) continue;

      const rawVal = orderData.submittedMeasurements[def.id];
      const val = Number(rawVal);

      // Must be integer between 1 and 120
      if (!Number.isInteger(val) || val < 1 || val > 120) {
        if (item.is_required) {
          return {
            success: false,
            error: `Measurement "${def.name} / ${def.hausa_name}" must be a whole number between 1 and 120.`,
          };
        }
      } else {
        measurementsToInsert.push({
          measurement_definition_id: def.id,
          measurement_name_at_order: `${def.name} / ${def.hausa_name}`,
          value: val,
        });
      }
    }

    // 2. Compute Authoritative Order Financials
    const total = orderData.sewingFee + orderData.embroideryFee;
    const isFullPay = orderData.paymentPlan === '100_PERCENT';
    const amountPaid = isFullPay ? total : Math.round(total * 0.5);
    const paymentStatus = isFullPay ? '100%_FULLY_PAID' : '50%_DEPOSIT_PAID';
    const paymentChoice = isFullPay ? '100_PERCENT_FULL' : '50_PERCENT_DEPOSIT';

    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderRef = `ORD-${randomHex}`;

    // 3. Insert Master Order record
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_reference: orderRef,
        customer_name: (orderData.customerName || '').trim() || 'Walk-in Client',
        customer_phone: (orderData.customerPhone || '').trim() || 'N/A',
        status: 'NEW',
        sewing_style_id: orderData.sewingStyleId,
        sewing_style_name_at_order: orderData.sewingStyleName,
        sewing_charge_at_order: orderData.sewingFee,
        sewing_fee: orderData.sewingFee,
        design_name_at_order: orderData.designName,
        design_reference_at_order: orderData.designCode,
        design_price_at_order: orderData.embroideryFee,
        embroidery_fee: orderData.embroideryFee,
        total_price_at_order: total,
        total_price: total,
        amount_paid: amountPaid,
        payment_choice: paymentChoice,
        payment_status: paymentStatus,
        neck_style: orderData.neckStyle || 'Classic Stand Collar',
        pocket_style: orderData.pocketStyle || 'Double Side Pocket',
        cuff_style: orderData.cuffStyle || 'Open Plain Sleeve',
        customer_measurements: orderData.submittedMeasurements,
      })
      .select('id, order_reference')
      .single();

    if (orderError || !insertedOrder) {
      console.error('Order creation error:', orderError);
      return { success: false, error: orderError?.message || 'Could not record bespoke order.' };
    }

    // 4. Insert Historical Snapshots into order_measurements
    const orderMeasurementsPayload = measurementsToInsert.map((m) => ({
      order_id: insertedOrder.id,
      measurement_definition_id: m.measurement_definition_id,
      measurement_name_at_order: m.measurement_name_at_order,
      value: m.value,
    }));

    if (orderMeasurementsPayload.length > 0) {
      const { error: measError } = await supabase
        .from('order_measurements')
        .insert(orderMeasurementsPayload);

      if (measError) {
        console.error('Historical measurement insertion error:', measError);
      }
    }

    return { success: true, orderRef: insertedOrder.order_reference };
  } catch (err: any) {
    console.error('Fatal order submission error:', err);
    return { success: false, error: err.message || 'Server error occurred while creating order.' };
  }
}