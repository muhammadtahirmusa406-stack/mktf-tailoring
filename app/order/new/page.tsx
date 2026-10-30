import { createClient } from '@/utils/supabase-server';
import OrderCatalogClient from './client-catalog';

export const dynamic = 'force-dynamic';

export default async function OrderBookingPage() {
  const supabase = await createClient();

  // 1. Fetch active sewing styles
  const { data: sewingStyles = [] } = await supabase
    .from('sewing_styles')
    .select('id, name, description, sewing_charge, base_price, image_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // 2. Fetch active embroidery designs
  const { data: designs = [] } = await supabase
    .from('embroidery_designs')
    .select('id, name, code, category_name, price, image_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // 3. Fetch exact measurement definitions linked per sewing style
  const { data: styleMeasurements = [] } = await supabase
    .from('sewing_style_measurements')
    .select(`
      id,
      sewing_style_id,
      display_order,
      is_required,
      measurement_definitions (
        id,
        name,
        hausa_name,
        key
      )
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  return (
    <OrderCatalogClient
      initialStyles={sewingStyles || []}
      initialDesigns={designs || []}
      initialStyleMeasurements={styleMeasurements || []}
    />
  );
}