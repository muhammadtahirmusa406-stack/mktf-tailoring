import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  // 2. Validate profile (allow admin and child_shop floor managers)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'customer') {
    redirect('/dashboard');
  }

  // 3. Fetch metrics in parallel
  const [
    { data: ordersData },
    { data: shopsData },
    { data: profilesData }
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
  const totalOutstanding = Math.max(0, totalRevenue - totalCollected);

  const inProductionCount = orders.filter(o => ['CUTTING', 'EMBROIDERY', 'SEWING'].includes(o.status)).length;
  const readyCount = orders.filter(o => o.status === 'READY FOR PICKUP').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>●</span> Master Atelier Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Workshop Command Center</h1>
            <p className="text-xs text-slate-400 mt-1">Multi-branch atelier metrics, order progression & revenue oversight</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition"
            >
              Manage Orders 📦
            </Link>
            <Link
              href="/order/new"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-sm"
            >
              + New Intake ↗
            </Link>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Booked Volume</span>
            <p className="text-2xl font-black text-white mt-1">₦{totalRevenue.toLocaleString()}</p>
            <span className="text-[11px] text-slate-500 mt-1 block">{totalOrdersCount} orders total</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Total Cash Collected</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">₦{totalCollected.toLocaleString()}</p>
            <span className="text-[11px] text-slate-500 mt-1 block">Deposits & fully settled</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-amber-400">Outstanding Balances</span>
            <p className="text-2xl font-black text-amber-400 mt-1">₦{totalOutstanding.toLocaleString()}</p>
            <span className="text-[11px] text-slate-500 mt-1 block">Locked by delivery gate</span>
          </div>
        </div>

        {/* Production Floor Throughput */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Production Floor Load</h3>
            <span className="text-xs text-slate-400">{activeShopsCount} active workshops</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-2xl font-black text-amber-400">{inProductionCount}</span>
              <p className="text-[11px] text-slate-400 font-bold mt-1">IN PROGRESS</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-2xl font-black text-blue-400">{readyCount}</span>
              <p className="text-[11px] text-slate-400 font-bold mt-1">READY FOR PICKUP</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-2xl font-black text-emerald-400">{completedCount}</span>
              <p className="text-[11px] text-slate-400 font-bold mt-1">COMPLETED</p>
            </div>
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          <Link
            href="/admin/orders"
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition group"
          >
            <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">Workshop Orders & Floor →</h4>
            <p className="text-xs text-slate-400 mt-1">Track cutting, embroidery, and sewing stages across all branches.</p>
          </Link>

          <Link
            href="/admin/shops"
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition group"
          >
            <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">Child Shops & Branches →</h4>
            <p className="text-xs text-slate-400 mt-1">Register new atelier branches, manage owners and assign workloads.</p>
          </Link>

          <Link
            href="/staff/branch-floor"
            className="p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition group"
          >
            <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">Artisan Floor Terminal →</h4>
            <p className="text-xs text-slate-400 mt-1">Direct live queue for artisans to switch floors and progress garments.</p>
          </Link>
        </div>

      </div>
    </div>
  );
}
