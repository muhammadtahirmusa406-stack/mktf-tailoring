import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch metrics in parallel
  const [
    { data: ordersData, error: ordersErr },
    { data: shopsData, error: shopsErr },
    { data: profilesData, error: profilesErr }
  ] = await Promise.all([
    supabase.from('orders').select('id, order_reference, customer_name, total_price, amount_paid, payment_status, status, child_shop_id, created_at').order('created_at', { ascending: false }),
    supabase.from('child_shops').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email, role')
  ]);

  const orders = ordersData || [];
  const shops = shopsData || [];

  // Financial & Operational Metrics
  const totalOrdersCount = orders.length;
  const activeShopsCount = shops.filter(s => s.status !== 'inactive').length;
  
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const totalCollected = orders.reduce((sum, o) => sum + (Number(o.amount_paid) || 0), 0);
  const totalOutstanding = totalRevenue - totalCollected;

  const inProductionCount = orders.filter(o => ['CUTTING', 'EMBROIDERY', 'SEWING'].includes(o.status)).length;
  const readyCount = orders.filter(o => o.status === 'READY FOR PICKUP').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>●</span> MKTF Executive Command Hub
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Master Atelier Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Multi-branch workshop performance, live production queues, and financial gates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/orders"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
            >
              📦 Workshop Pipeline ({inProductionCount})
            </Link>
            <Link
              href="/admin/shops"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition"
            >
              🏪 Child Shops ({shops.length})
            </Link>
            <Link
              href="/order/new"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition"
            >
              + New Bespoke Intake ↗
            </Link>
          </div>
        </div>

        {/* High-Level Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Child Shops</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-amber-400">{shops.length}</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {activeShopsCount} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Independent workshop branches with isolated cutting tables</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active In-Production</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-blue-400">{inProductionCount}</span>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                Floor Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">{readyCount} ready for pickup | {completedCount} fulfilled</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-400">₦{totalCollected.toLocaleString()}</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Paid In
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">From {totalOrdersCount} lifetime tailoring orders</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locked Balances Due</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-rose-400">₦{totalOutstanding.toLocaleString()}</span>
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Gated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Delivery blocked until 100% full settlement</p>
          </div>
        </div>

        {/* Main Workstations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Workshop Quick Controls (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🧵</span> Atelier Operations Directory
                </h2>
                <Link href="/admin/orders" className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
                  Open Live Floor →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/admin/orders"
                  className="group p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl mb-2 block">📋</span>
                    <h3 className="font-bold text-slate-200 group-hover:text-amber-400 transition text-sm">
                      Workshop Orders & Floor Progression
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Assign orders to child shops, progress through Cutting, Embroidery, and Sewing stages, and enforce delivery payment gates.
                    </p>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold mt-4 block">Manage Orders →</span>
                </Link>

                <Link
                  href="/admin/shops"
                  className="group p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl mb-2 block">🏪</span>
                    <h3 className="font-bold text-slate-200 group-hover:text-amber-400 transition text-sm">
                      Child Shops & Artisan Branches
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Register new atelier branches, manage owner profiles, and monitor cutting-table workloads across states.
                    </p>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold mt-4 block">Manage Branches →</span>
                </Link>

                <Link
                  href="/admin/catalog"
                  className="group p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl mb-2 block">🎨</span>
                    <h3 className="font-bold text-slate-200 group-hover:text-amber-400 transition text-sm">
                      Catalog Studio & Designs
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload fabric swatches, high-res embroidery photos, design collections, and configure bespoke pricing.
                    </p>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold mt-4 block">Edit Catalog →</span>
                </Link>

                <Link
                  href="/order/new"
                  target="_blank"
                  className="group p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <span className="text-2xl mb-2 block">✂️</span>
                    <h3 className="font-bold text-slate-200 group-hover:text-amber-400 transition text-sm">
                      Customer Intake & Bespoke Portal
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Public measurement entry, smart returning-customer profile lookup, style selection, and 50% deposit checkout.
                    </p>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold mt-4 block">Launch Intake Form ↗</span>
                </Link>
              </div>
            </div>

            {/* Recent Orders Stream */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span>Recent Workshop Intake</span>
                <span className="text-xs font-normal text-slate-400">Last 5 orders booked</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                    <tr>
                      <th className="pb-3 font-semibold">Reference</th>
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Financials</th>
                      <th className="pb-3 font-semibold text-right">Job Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.slice(0, 5).map((ord) => {
                      const balance = Number(ord.total_price) - Number(ord.amount_paid);
                      const isPaid = ord.payment_status === '100%_FULLY_PAID' || balance <= 0;
                      return (
                        <tr key={ord.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 font-bold text-amber-400 font-mono">
                            {ord.order_reference}
                          </td>
                          <td className="py-3 font-medium text-slate-200">
                            {ord.customer_name}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="text-slate-200 font-semibold">₦{Number(ord.total_price).toLocaleString()}</span>
                              <span className={`text-[10px] ${isPaid ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
                                {isPaid ? '100% Settled' : `Bal: ₦${balance.toLocaleString()}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              href={`/admin/orders/${ord.id}/print`}
                              target="_blank"
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700"
                            >
                              🖨️ Print Slip
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No orders registered yet. New orders submitted via /order/new will appear here automatically.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Child Shops Sidebar (1 Column) */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🏪</span> Active Branch Workshops
                </h2>
                <Link href="/admin/shops" className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
                  + Add
                </Link>
              </div>

              <div className="space-y-3">
                {shops.map((shop) => {
                  const assignedOrders = orders.filter(o => o.child_shop_id === shop.id);
                  return (
                    <div
                      key={shop.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-200">{shop.name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {shop.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <span>📍</span> {shop.location || 'Location unassigned'}
                      </p>
                      <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Floor Orders:</span>
                        <span className="font-bold text-amber-400">{assignedOrders.length} in queue</span>
                      </div>
                    </div>
                  );
                })}

                {shops.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No branches registered. Go to Child Shops to configure your first workshop.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Box */}
            <div className="bg-gradient-to-br from-amber-500/10 to-indigo-500/10 border border-amber-500/20 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-amber-300">WhatsApp Atelier Ready</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Customers placing tailoring orders from WhatsApp land on <span className="text-slate-200 font-mono">/order/new</span>. When they submit, orders link to this central dashboard and their designated workshop branch.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/track"
                  target="_blank"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Customer Tracker ↗
                </Link>
                <Link
                  href="/staff/branch-floor"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Artisan View →
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
