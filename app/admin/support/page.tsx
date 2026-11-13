import { createClient } from '@/utils/supabase-server';
import SupportInboxClient from './support-inbox-client';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('support_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return <SupportInboxClient initialInquiries={data || []} />;
}