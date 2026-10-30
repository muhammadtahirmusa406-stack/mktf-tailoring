import { createClient } from '@/utils/supabase-server';
import { redirect } from 'next/navigation';
import BranchFloorClient from './branch-floor-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BranchFloorPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/staff/login?next=/staff/branch-floor');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin' || role === 'master_admin';

  // Fetch all child shops
  const { data: allShops } = await supabase
    .from('child_shops')
    .select('*')
    .order('name', { ascending: true });

  const shops = allShops || [];

  // Determine active branch
  let assignedShopId = resolvedParams?.shopId || profile?.child_shop_id || null;

  if (!assignedShopId) {
    const ownedShop = shops.find(s => s.owner_profile_id === user.id);
    if (ownedShop) {
      assignedShopId = ownedShop.id;
    } else if (shops.length > 0) {
      assignedShopId = shops[0].id;
    }
  }

  const activeShop = shops.find(s => s.id === assignedShopId) || shops[0] || null;

  // Fetch orders for this branch
  let orders: any[] = [];
  if (activeShop) {
    const { data: shopOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('child_shop_id', activeShop.id)
      .order('created_at', { ascending: false });
    orders = shopOrders || [];
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Floor Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>●</span> Live Artisan Floor
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🧵</span> {activeShop?.name || 'Artisan Workshop Floor'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {activeShop?.location || 'Central Workshop'} &bull; Cutting, Embroidery, and Sewing Workstations
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <form method="GET" action="/staff/branch-floor" className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold hidden sm:inline">Switch Floor:</span>
                <select
                  name="shopId"
                  defaultValue={activeShop?.id || ''}
                  aria-label="Switch Floor Branch"
                  className="bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || 'HQ'})
                    </option>
                  ))}
                </select>
                <button type="submit" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700">
                  Switch 🔁
                </button>
              </form>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition"
              >
                ← Admin Hub
              </Link>
            )}
          </div>
        </div>

        {/* Client Interactive Floor Grid */}
        {activeShop ? (
          <BranchFloorClient
            orders={orders} initialOrders={orders}
            branchName={activeShop.name}
            shopId={activeShop.id}
          />
        ) : (
          <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            No active workshop branches registered. Please create a child shop first in the Admin Hub.
          </div>
        )}

      </div>
    </div>
  );
}
