import { createClient } from '@/utils/supabase-server';
import { redirect } from 'next/navigation';
import BranchFloorClient from './branch-floor-client';

export default async function BranchFloorPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/staff/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role?.toLowerCase();

  // If Admin lands here, redirect to Catalog Studio
  if (role === 'admin' || role === 'master_admin') {
    redirect('/admin/catalog');
  }

  // Resolve artisan's assigned child shop
  let assignedShopId = profile?.child_shop_id || null;
  let branchName = profile?.shop_name || 'Workshop Branch';

  if (!assignedShopId) {
    // Try matching owner_profile_id
    const { data: ownedShop } = await supabase
      .from('child_shops')
      .select('id, name')
      .eq('owner_profile_id', user.id)
      .maybeSingle();

    if (ownedShop) {
      assignedShopId = ownedShop.id;
      branchName = ownedShop.name || branchName;
    } else if (profile?.shop_name) {
      // Try matching by registered shop_name
      const { data: namedShop } = await supabase
        .from('child_shops')
        .select('id, name')
        .ilike('name', profile.shop_name.trim())
        .maybeSingle();

      if (namedShop) {
        assignedShopId = namedShop.id;
        branchName = namedShop.name;
      }
    }
  }

  // Strictly scope orders: if no shop assigned, isolate to empty list
  let orders: any[] = [];
  if (assignedShopId) {
    const { data: branchOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('child_shop_id', assignedShopId)
      .order('created_at', { ascending: false });

    orders = branchOrders || [];
  }

  return (
    <BranchFloorClient 
      orders={orders} 
      profile={{
        ...(profile || {}),
        branch_name: branchName,
        child_shop_id: assignedShopId,
        role: 'child_shop',
      }} 
    />
  );
}