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
  let customerOrders: any[] = [];

  if (cleanQuery) {
    const supabase = await createClient();

    const isReference = cleanQuery.toUpperCase().startsWith('ORD-') || /[a-zA-Z]/.test(cleanQuery);

    if (isReference) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .ilike('order_reference', `%${cleanQuery}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      order = data;
      if (data) customerOrders = [data];
    } else {
      const digitsOnly = cleanQuery.replace(/\D/g, '');
      const phoneSuffix = digitsOnly.length >= 8 ? digitsOnly.slice(-9) : digitsOnly;

      const { data: matchedOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`customer_phone.ilike.%${phoneSuffix}%,order_reference.ilike.%${cleanQuery}%`)
        .order('created_at', { ascending: false });

      if (matchedOrders && matchedOrders.length > 0) {
        order = matchedOrders[0];
        customerOrders = matchedOrders;
      }
    }
  }

  return (
    <TrackOrderPageClient
      order={order}
      customerOrders={customerOrders}
      rawQuery={cleanQuery}
      searched={Boolean(cleanQuery)}
    />
  );
}