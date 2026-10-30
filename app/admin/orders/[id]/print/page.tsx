import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintJobSlipClient from './print-job-slip-client';

export const dynamic = 'force-dynamic';

export default async function PrintOrderSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (!order) {
    notFound();
  }

  return <PrintJobSlipClient order={order} />;
}