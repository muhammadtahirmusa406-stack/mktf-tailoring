'use server';

import { createClient } from '@/utils/supabase-server';
import crypto from 'crypto';

export async function checkReturningCustomerAction(phone: string) {
  try {
    const supabase = await createClient();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      return { found: false };
    }

    const shortPhone = cleanPhone.slice(-9);

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_reference, customer_name, customer_phone, sewing_style_id, customer_measurements, created_at')
      .ilike('customer_phone', `%${shortPhone}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !data.customer_measurements) {
      return { found: false };
    }

    return {
      found: true,
      profile: {
        orderReference: data.order_reference,
        customerName: data.customer_name,
        sewingStyleId: data.sewing_style_id,
        measurements: data.customer_measurements,
      },
    };
  } catch (err) {
    console.error('Error checking returning customer:', err);
    return { found: false };
  }
}

export async function createNewOrderAction(orderData: {
  sewingStyleId: string;
  sewingStyleName: string;
  sewingStyleImageUrl?: string | null;
  sewingFee: number;
  designName: string;
  designCode: string;
  designImageUrl?: string | null;
  embroideryFee: number;
  paymentPlan: '50_PERCENT' | '100_PERCENT';
  customerName?: string;
  customerPhone?: string;
  neckStyle?: string;
  pocketStyle?: string;
  cuffStyle?: string;
  submittedMeasurements?: Record<string, number>;
  measurements?: Record<string, number>;
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

    // Core required bespoke dimensions: Shoulder, Sleeve, Shirt Length, Neck, Trouser Length
      const optionalKeys = ['shirt_width', 'fadin_rigar', 'hand_opening', 'fadin_hannu', 'trouser_waist', 'kwankwaso', 'leg_opening', 'fadin_kafa'];

      for (const item of configuredMeasurements) {
        const def: any = item.measurement_definitions;
        if (!def) continue;

        const measurementsMap = orderData.submittedMeasurements || orderData.measurements || {};
        const rawVal = measurementsMap[def.id];

        // If the field is optional or blank
        const isClientOptional = optionalKeys.some(k => 
          (def.key && def.key.toLowerCase().includes(k)) || 
          (def.name && def.name.toLowerCase().includes('width')) ||
          (def.name && def.name.toLowerCase().includes('opening')) ||
          (def.name && def.name.toLowerCase().includes('waist'))
        );

        if (rawVal === undefined || rawVal === null || (rawVal as any) === '') {
          // If marked optional on client, skip cleanly
          if (isClientOptional || !item.is_required) {
            continue;
          }
          return {
            success: false,
            error: `Measurement "${def.name} / ${def.hausa_name}" is required.`,
          };
        }

        const val = Number(rawVal);
        if (!Number.isInteger(val) || val < 1 || val > 120) {
          if (isClientOptional) {
            continue; // Ignore malformed blank optional fields
          }
          return {
            success: false,
            error: `Measurement "${def.name} / ${def.hausa_name}" must be a whole number between 1 and 120.`,
          };
        }

        measurementsToInsert.push({
          measurement_definition_id: def.id,
          measurement_name_at_order: `${def.name} / ${def.hausa_name}`,
          value: val,
        });
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
        sewing_style_image_url: orderData.sewingStyleImageUrl || null,
        sewing_charge_at_order: orderData.sewingFee,
        sewing_fee: orderData.sewingFee,
        design_name_at_order: orderData.designName,
        design_reference_at_order: orderData.designCode,
        design_image_url: orderData.designImageUrl || null,
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

export async function lookupCustomerHistory(phone: string) {
  try {
    const cleanPhone = (phone || '').replace(/\s+/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, found: false };
    }

    const supabase = await createClient();
    const { data: previousOrder, error } = await supabase
      .from('orders')
      .select('id, order_reference, customer_name, customer_phone, sewing_style_id, customer_measurements, created_at')
      .ilike('customer_phone', `%${cleanPhone}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !previousOrder || !previousOrder.customer_measurements) {
      return { success: false, found: false };
    }

    return {
      success: true,
      found: true,
      orderReference: previousOrder.order_reference,
      customerName: previousOrder.customer_name,
      previousStyleId: previousOrder.sewing_style_id,
      measurements: previousOrder.customer_measurements,
    };
  } catch (err: any) {
    console.error('Error looking up customer profile:', err);
    return { success: false, found: false };
  }
}

export async function getAtelierSettingsAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('atelier_settings')
      .select('bank_name, account_number, account_name, is_active')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      return {
        bankName: 'OPay',
        accountNumber: '8030635560',
        accountName: 'Abdulrahman Aliyu',
      };
    }

    return {
      bankName: data.bank_name,
      accountNumber: data.account_number,
      accountName: data.account_name,
    };
  } catch {
    return {
      bankName: 'OPay',
      accountNumber: '8030635560',
      accountName: 'Abdulrahman Aliyu',
    };
  }
}

export async function updateAtelierSettingsAction(bankName: string, accountNumber: string, accountName: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('atelier_settings')
      .upsert({
        id: 'default',
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        updated_at: new Date().toISOString()
      });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitOrderWithReceiptAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const orderDataJson = formData.get('orderData') as string;
    const file = formData.get('receiptFile') as File | null;
    const verificationDataJson = formData.get('verificationData') as string;

    if (!orderDataJson) {
      return { success: false, error: 'Missing order details.' };
    }

    const payload = JSON.parse(orderDataJson);
    const verification = verificationDataJson ? JSON.parse(verificationDataJson) : null;

    if (!verification || !verification.referenceId) {
      return { success: false, error: 'Transaction rejected: Receipt verification is required and must contain a valid Reference/Session ID.' };
    }

    const cleanRefId = String(verification.referenceId).trim();

    // -------------------------------------------------------------
    // SECURITY CHECK: DEDUPLICATION & REPLAY PREVENTION
    // -------------------------------------------------------------
    const { data: duplicateInitial } = await supabase
      .from('orders')
      .select('id, order_reference')
      .eq('transaction_reference', cleanRefId)
      .maybeSingle();

    if (duplicateInitial) {
      return {
        success: false,
        error: `Security Replay Block: This receipt (Session ID: ${cleanRefId}) was already used for order #${duplicateInitial.order_reference}. You cannot reuse the same receipt.`,
      };
    }

    const { data: ordersWithVerifications } = await supabase
      .from('orders')
      .select('id, order_reference, payment_verification_data')
      .not('payment_verification_data', 'is', null)
      .limit(250);

    const duplicateHistory = (ordersWithVerifications || []).find((ord: any) => {
      const pvd = ord.payment_verification_data;
      return (
        pvd?.referenceId === cleanRefId ||
        pvd?.final_settlement?.referenceId === cleanRefId ||
        pvd?.final_settlement?.extractedData?.referenceId === cleanRefId
      );
    });

    if (duplicateHistory) {
      return {
        success: false,
        error: `Security Replay Block: This receipt (Session ID: ${cleanRefId}) has already been recorded on order #${duplicateHistory.order_reference}.`,
      };
    }

    let receiptUrl = '';
    if (file && typeof file.arrayBuffer === 'function') {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(fileName, buffer, {
          contentType: file.type || 'image/png',
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(uploadData.path);
        receiptUrl = publicUrlData.publicUrl;
      }
    }

    const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Fetch style & design snapshot labels dynamically if missing
    let styleName = payload.sewingStyleName || null;
    let designRef = payload.designCode || null;
    let designName = payload.designName || null;

    if (payload.sewingStyleId && !styleName) {
      const { data: s } = await supabase.from('sewing_styles').select('name').eq('id', payload.sewingStyleId).maybeSingle();
      if (s) styleName = s.name;
    }
    if (payload.embroideryDesignId && !designRef) {
      const { data: d } = await supabase.from('embroidery_designs').select('design_code, name').eq('id', payload.embroideryDesignId).maybeSingle();
      if (d) {
        designRef = d.design_code;
        designName = d.name;
      }
    }

    const { data: newOrder, error: insertErr } = await supabase
      .from('orders')
      .insert({
        sewing_style_name_at_order: styleName,
        design_reference_at_order: designRef,
        design_name_at_order: designName,
        order_reference: orderRef,
        customer_name: payload.customerName,
        customer_phone: payload.customerPhone,
        sewing_style_id: payload.sewingStyleId,
        customer_measurements: payload.measurements,
        total_price: payload.totalAmount,
        amount_paid: payload.amountToPay,
        payment_choice: (payload.paymentPlan === '50_PERCENT' || payload.amountToPay < payload.totalAmount) ? '50_PERCENT_DEPOSIT' : '100_PERCENT_FULL',
        payment_status: (payload.paymentPlan === '50_PERCENT' || payload.amountToPay < payload.totalAmount) ? '50%_DEPOSIT_PAID' : '100%_FULLY_PAID',
        status: 'CUTTING',
        receipt_url: receiptUrl || null,
        transaction_reference: verification?.referenceId || null,
        payment_verification_data: verification || null,
      })
      .select('id, order_reference')
      .single();

    if (insertErr || !newOrder) {
      console.error('Order insert error:', insertErr);
      return { success: false, error: insertErr?.message || 'Could not place order.' };
    }

    return {
      success: true,
      orderReference: newOrder.order_reference,
    };
  } catch (err: any) {
    console.error('submitOrderWithReceiptAction error:', err);
    return { success: false, error: err.message || 'Server error while completing order.' };
  }
}
