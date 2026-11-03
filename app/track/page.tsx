import { createClient } from '@/lib/supabase/server';
import TrackOrderPageClient from './client-track';

export const dynamic = 'force-dynamic';

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const cleanQuery = (params.query || params.ref || '').trim();

  let order: any = null;

  if (cleanQuery) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .or(`order_reference.ilike.%${cleanQuery}%,customer_phone.ilike.%${cleanQuery}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    order = data;
  }

  return (
    <TrackOrderPageClient
      order={order}
      rawQuery={cleanQuery}
      searched={Boolean(cleanQuery)}
    />
  );
}
