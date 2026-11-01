import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';
import OrdersProgressionClient from './orders-progression-client';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  let orders: any[] = [];
  let shops: any[] = [];

  try {
    const [ordersRes, shopsRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('child_shops').select('id, name, location').order('name', { ascending: true })
    ]);

          const rawOrders = ordersRes.data || [];
      shops = shopsRes.data || [];

      // Fallback hydration for legacy orders without direct image snapshots
      const missingStyleIds = Array.from(new Set(rawOrders.filter((o: any) => !o.sewing_style_image_url && o.sewing_style_id).map((o: any) => o.sewing_style_id)));
      const missingDesignRefs = Array.from(new Set(rawOrders.filter((o: any) => !o.design_image_url && o.design_reference_at_order).map((o: any) => o.design_reference_at_order)));

      const [{ data: fallbackStyles = [] }, { data: fallbackDesigns = [] }] = await Promise.all([
        missingStyleIds.length ? supabase.from('sewing_styles').select('id, image_url').in('id', missingStyleIds) : { data: [] },
        missingDesignRefs.length ? supabase.from('designs').select('reference_code, image_path, image_url').in('reference_code', missingDesignRefs) : { data: [] },
      ]);

      const styleMap = new Map(((fallbackStyles as any[]) || []).map((s: any) => [s.id, s.image_url]));
      const designMap = new Map(((fallbackDesigns as any[]) || []).map((d: any) => [d.reference_code, d.image_url || d.image_path]));

      orders = rawOrders.map((ord: any) => ({
        ...ord,
        sewing_style_image_url: ord.sewing_style_image_url || styleMap.get(ord.sewing_style_id) || null,
        design_image_url: ord.design_image_url || designMap.get(ord.design_reference_at_order) || null,
      }));
  } catch (err) {
    console.error('Unexpected error loading orders or shops:', err);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>?</span> Master Atelier Production Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Workshop Floor & Branch Routing
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Assign garments to child shops, progress through Cutting to Pickup, and release under financial delivery gates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition"
            >
              ? Command Hub
            </Link>
            <Link
              href="/admin/shops"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition"
            >
              ?? Child Shops ({shops.length})
            </Link>
            <Link
              href="/order/new"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
            >
              + New Intake ?
            </Link>
          </div>
        </div>

        {/* Interactive Orders Progression Board */}
        <OrdersProgressionClient initialOrders={orders} availableShops={shops} />

      </div>
    </div>
  );
}
