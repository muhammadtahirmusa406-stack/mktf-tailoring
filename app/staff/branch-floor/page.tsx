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

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <BranchFloorClient 
      orders={orders || []} 
      profile={profile || { role: 'child_shop' }} 
    />
  );
}