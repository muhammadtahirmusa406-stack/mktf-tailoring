import { createClient } from './utils/supabase-server';

async function checkOrderImages() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(2);
  console.log('Order sample columns:', data ? Object.keys(data[0] || {}) : error);
  if (data && data[0]) {
    console.log('Sample order image-related values:', {
      design_image_url: data[0].design_image_url,
      style_image_url: data[0].style_image_url,
      fabric_image_url: data[0].fabric_image_url,
      image_url: data[0].image_url,
      design_id: data[0].design_id,
      fabric_id: data[0].fabric_id,
    });
  }
}
checkOrderImages();
