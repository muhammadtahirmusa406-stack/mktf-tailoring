'use server';

import { createClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';

export async function submitSupportInquiryAction(params: {
  senderRole?: string;
  senderName: string;
  senderPhone: string;
  topic: string;
  message: string;
}): Promise<{ success: boolean; ticketReference?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('submit_support_inquiry', {
      p_sender_role: params.senderRole || 'customer',
      p_sender_name: params.senderName,
      p_sender_phone: params.senderPhone,
      p_topic: params.topic,
      p_message: params.message,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/support');
    return {
      success: true,
      ticketReference: data?.ticket_reference,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Could not submit support inquiry.' };
  }
}

export async function lookupSupportInquiriesAction(query: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('lookup_support_inquiries', {
      p_query: query,
    });

    if (error) {
      return { success: false, inquiries: [], error: error.message };
    }
    return { success: true, inquiries: data || [] };
  } catch (err: any) {
    return { success: false, inquiries: [], error: err.message };
  }
}