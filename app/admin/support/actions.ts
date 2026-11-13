'use server';

import { createClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';

export async function replyToSupportInquiryAction(
  inquiryId: string,
  replyText: string,
  newStatus: 'REPLIED' | 'RESOLVED' = 'REPLIED'
): Promise<{ success: boolean; error?: string }> {
  if (!inquiryId || !replyText.trim()) {
    return { success: false, error: 'Reply message cannot be empty.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('support_inquiries')
    .update({
      admin_reply: replyText.trim(),
      status: newStatus,
      replied_at: new Date().toISOString(),
    })
    .eq('id', inquiryId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/support');
  revalidatePath('/contact');
  return { success: true };
}