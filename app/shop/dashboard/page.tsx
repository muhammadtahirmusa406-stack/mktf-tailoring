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
    redirect('/staff/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'MASTER_ADMIN';

  // Fetch all child shops
  const { data: shops = [] } = await supabase
    .from('child_shops')
    .select('*')
    .order('name', { ascending: true });

  let activeShop: any = null;

  if (isAdmin) {
    // If Admin selects a shop via dropdown/query, use it; otherwise default to first available shop
    if (resolvedSearchParams?.shopId) {
      activeShop = (shops || []).find((s) => s.id === resolvedSearchParams.shopId) || (shops || [])[0];
    } else {
      activeShop = (shops || [])[0] || null;
    }
  } else {
    // Regular branch manager/artisan: look up shop where they are the registered owner
    activeShop = (shops || []).find((s) => s.owner_profile_id === user.id);

    // If application is pending or inactive, send to status tracker
    if (activeShop && activeShop.status === 'pending') {
      redirect('/partner/status');
    }
  }

  if (!activeShop) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <span className="text-4xl">🏬</span>
          <h2 className="text-xl font-bold text-white">No Workshop Branch Configured</h2>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? 'No child shops have been added to the system yet.'
              : `Your account (${profile?.full_name || profile?.email}) is not currently linked to an active workshop branch.`}
          </p>
          {isAdmin ? (
            <Link
              href="/admin/shops"
              className="inline-block px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Configure Branches in Admin Hub ?
            </Link>
          ) : (
            <Link
              href="/partner/apply"
              className="inline-block px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Submit Workshop Application ?
            </Link>
          )}
        </div>
      </div>
    );
  }

      // Fetch orders strictly assigned to this shop
    const { data: rawOrders = [] } = await supabase
      .from('orders')
      .select('*')
      .eq('child_shop_id', activeShop.id)
      .order('created_at', { ascending: false });

    // Fallback hydration for orders placed prior to direct image URL snapshotting
    const missingStyleIds = Array.from(new Set((rawOrders || []).filter((o: any) => !o.sewing_style_image_url && o.sewing_style_id).map((o: any) => o.sewing_style_id)));
    const missingDesignRefs = Array.from(new Set((rawOrders || []).filter((o: any) => !o.design_image_url && o.design_reference_at_order).map((o: any) => o.design_reference_at_order)));

    const [{ data: fallbackStyles = [] }, { data: fallbackDesigns = [] }] = await Promise.all([
      missingStyleIds.length ? supabase.from('sewing_styles').select('id, image_url').in('id', missingStyleIds) : { data: [] },
      missingDesignRefs.length ? supabase.from('designs').select('reference_code, image_path, image_url').in('reference_code', missingDesignRefs) : { data: [] },
    ]);

    const styleMap = new Map(((fallbackStyles as any[]) || []).map((s: any) => [s.id, s.image_url]));
    const designMap = new Map(((fallbackDesigns as any[]) || []).map((d: any) => [d.reference_code, d.image_url || d.image_path]));

    const branchOrders = (rawOrders || []).map((ord: any) => ({
      ...ord,
      sewing_style_image_url: ord.sewing_style_image_url || styleMap.get(ord.sewing_style_id) || null,
      design_image_url: ord.design_image_url || designMap.get(ord.design_reference_at_order) || null,
    }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Branch Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🧵</span> Workshop Floor: {activeShop.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>🏬</span> {activeShop.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>📍 {activeShop.location || 'Branch Floor'}</span>
              <span>•</span>
              <span>Artisan Floor Mode</span>
              
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Admin Live Branch Switcher */}
            {isAdmin && (shops || []).length > 1 && (
              <form method="GET" action="/shop/dashboard" className="flex items-center gap-2">
                <select
                  name="shopId"
                  defaultValue={activeShop.id}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                >
                  {(shops || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || 'Branch'})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  Switch ⇄
                </button>
              </form>
            )}

            
            <Link
              href="/order/new"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              + New Intake ↗
            </Link>
          </div>
        </div>

        {/* Client Floor Board */}
        <ShopFloorClient
          initialOrders={branchOrders || []}
          shopName={activeShop.name}
          shopId={activeShop.id}
        />
      </div>
    </div>
  );
}
