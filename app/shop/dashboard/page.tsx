import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';
import ShopFloorClient from './shop-floor-client';

export const dynamic = 'force-dynamic';

export default async function ChildShopDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/shop/dashboard');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'MASTER_ADMIN';

  // Find the child shop associated with this user
  let activeShop: any = null;
  const { data: shops } = await supabase.from('child_shops').select('*');

  if (resolvedSearchParams?.shopId && isAdmin) {
    activeShop = shops?.find(s => s.id === resolvedSearchParams.shopId);
  } else {
    // Pick shop linked to user or fallback to first active shop
    activeShop = shops?.find(s => s.owner_profile_id === user.id) || shops?.[0];
  }

  if (!activeShop) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <span className="text-3xl">🏪</span>
          <h2 className="text-xl font-bold text-white">No Workshop Branch Assigned</h2>
          <p className="text-xs text-slate-400">
            Your profile ({profile?.full_name || profile?.email}) is not currently linked to an active child shop branch.
          </p>
          {isAdmin && (
            <Link
              href="/admin/shops"
              className="inline-block px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Configure Branches in Admin Hub →
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Fetch orders strictly assigned to this shop
  const { data: branchOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('child_shop_id', activeShop.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Branch Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>●</span> Branch Workshop Floor
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🏪</span> {activeShop.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>📍 {activeShop.location || 'Central Workshop'}</span>
              <span>•</span>
              <span>Artisan Floor Mode</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition"
              >
                ← Back to Admin Hub
              </Link>
            )}
            <Link
              href="/order/new"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
            >
              + Book New Intake ↗
            </Link>
          </div>
        </div>

        {/* Client Interactive Floor Queue */}
        <ShopFloorClient initialOrders={branchOrders || []} shopName={activeShop.name} shopId={activeShop.id} />

      </div>
    </div>
  );
}
