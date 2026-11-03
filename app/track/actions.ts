'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function settleBalanceWithReceiptAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const orderId = formData.get('orderId') as string;
    const file = formData.get('receiptFile') as File | null;
    const verificationDataJson = formData.get('verificationData') as string;

    if (!orderId) {
      return { success: false, error: 'Missing order identifier.' };
    }

    if (!verificationDataJson) {
      return { success: false, error: 'Verification data is required.' };
    }

    const verification = JSON.parse(verificationDataJson);
    const referenceId = String(verification?.referenceId || '').trim();

    if (!referenceId) {
      return { success: false, error: 'Security alert: Receipt must contain a valid Session/Transaction Reference ID.' };
    }

    // -------------------------------------------------------------
    // 7TH SECURITY RULE: DEDUPLICATION & REPLAY DETECTION
    // Check if this referenceId was EVER used in ANY order
    // -------------------------------------------------------------
    const { data: duplicateInitial } = await supabase
      .from('orders')
      .select('id, order_reference')
      .eq('transaction_reference', referenceId)
      .maybeSingle();

    if (duplicateInitial) {
      return {
        success: false,
        error: `Security Replay Block: This receipt (Session ID: ${referenceId}) was already used for order #${duplicateInitial.order_reference}. You cannot reuse the same receipt.`,
      };
    }

    // Check historical settlement JSON logs for duplicate session ID
    const { data: ordersWithVerifications } = await supabase
      .from('orders')
      .select('id, order_reference, payment_verification_data')
      .not('payment_verification_data', 'is', null)
      .limit(200);

    const duplicateHistory = (ordersWithVerifications || []).find((ord: any) => {
      const pvd = ord.payment_verification_data;
      return (
        pvd?.referenceId === referenceId ||
        pvd?.final_settlement?.referenceId === referenceId ||
        pvd?.final_settlement?.extractedData?.referenceId === referenceId
      );
    });

    if (duplicateHistory) {
      return {
        success: false,
        error: `Security Replay Block: This receipt (Session ID: ${referenceId}) has already been recorded on order #${duplicateHistory.order_reference}.`,
      };
    }

    // Fetch the target order
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return { success: false, error: 'Order not found.' };
    }

    const totalPrice = Number(order.total_price) || 0;
    const currentPaid = Number(order.amount_paid) || 0;
    const remainingBalance = Math.max(0, totalPrice - currentPaid);

    if (remainingBalance <= 0) {
      return { success: false, error: 'This order is already fully paid.' };
    }

    // Verify found amount in OCR matches remaining balance exactly
    const foundAmount = Number(verification.foundAmount) || 0;
    if (Math.abs(foundAmount - remainingBalance) > 0.01) {
      return {
        success: false,
        error: `Amount mismatch: Receipt indicates ₦${foundAmount.toLocaleString()}, but exact remaining balance is ₦${remainingBalance.toLocaleString()}.`,
      };
    }

    // Upload receipt screenshot to Supabase Storage
    let finalReceiptUrl = '';
    if (file && typeof file.arrayBuffer === 'function') {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `final_receipt_${order.order_reference}_${Date.now()}.${fileExt}`;
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
        finalReceiptUrl = publicUrlData.publicUrl;
      }
    }

    // Auto gate unlock: If status is READY FOR PICKUP, unlock gate to COMPLETED
    const currentStatus = (order.status || '').toUpperCase().trim();
    const shouldAutoComplete = currentStatus === 'READY FOR PICKUP' || currentStatus === 'READY';
    const nextStatus = shouldAutoComplete ? 'COMPLETED' : order.status;

    // Merge audit verification payload into payment_verification_data
    const updatedVerificationPayload = {
      ...(typeof order.payment_verification_data === 'object' && order.payment_verification_data !== null
        ? order.payment_verification_data
        : { initial: order.payment_verification_data }),
      final_settlement: {
        settled_at: new Date().toISOString(),
        amount_settled: remainingBalance,
        receipt_url: finalReceiptUrl || null,
        referenceId,
        extractedData: verification,
      },
    };

    // Update orders row using existing schema columns
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        amount_paid: totalPrice,
        payment_choice: '100_PERCENT_FULL',
        payment_status: '100%_FULLY_PAID',
        status: nextStatus,
        payment_verification_data: updatedVerificationPayload,
      })
      .eq('id', orderId);

    if (updateErr) {
      console.error('Balance settlement DB update error:', updateErr);
      return { success: false, error: updateErr.message || 'Failed to update order settlement.' };
    }

    revalidatePath('/track');
    revalidatePath('/admin/orders');

    return {
      success: true,
      autoCompleted: shouldAutoComplete,
      orderReference: order.order_reference,
    };
  } catch (err: any) {
    console.error('settleBalanceWithReceiptAction error:', err);
    return { success: false, error: err.message || 'Server error while processing balance settlement.' };
  }
}
