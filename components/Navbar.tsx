'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Navbar({ role }: { role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    async function loadShopIdentity() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Check user_metadata (set by registration action)
        const metaBranch = user.user_metadata?.branch_name;

        // 2. Check profile record
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const rawName = metaBranch || profile?.shop_name || profile?.full_name || '';

        if (rawName) {
          let cleanName = rawName.replace(/Artisan/gi, '').trim();
          if (!cleanName.toLowerCase().startsWith('mktf')) {
            cleanName = 'MKTF ' + cleanName;
          }
          setShopName(cleanName);
        }
      } catch (err) {
        console.error('Failed to load shop name for WhatsApp link:', err);
      }
    }

    loadShopIdentity();
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  };

  const currentPath = pathname || '';

  // 0. Do not display navbar on login or registration pages
  const isAuthRoute =
    currentPath === '/login' ||
    currentPath.startsWith('/login') ||
    currentPath === '/staff/login' ||
    currentPath.startsWith('/staff/login') ||
    currentPath === '/staff/register' ||
    currentPath.startsWith('/staff/register');

  if (isAuthRoute) {
    return null;
  }

  // 1. Customer-Facing Routes
  const isCustomerRoute = 
    currentPath.startsWith('/order') || 
    currentPath.startsWith('/track') || 
    currentPath.startsWith('/contact') || 
    role === 'customer';

  if (isCustomerRoute) {
    return (
      <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-2 overflow-x-hidden">
          <Link href="/order/new" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider shadow-md">
              MKTF
            </div>
            <div>
              <span className="font-extrabold tracking-wide text-white block text-sm sm:text-base leading-tight">
                MKTF TAILORING
              </span>
              <span className="text-[10px] sm:text-xs text-amber-400 font-semibold uppercase tracking-widest">
                Bespoke Atelier
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
            <Link
              href="/order/new"
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                currentPath.startsWith('/order')
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              ✨ Design Order
            </Link>

            <Link
              href="/track"
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                currentPath.startsWith('/track')
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              📍 Track Order
            </Link>

            <Link
              href="/contact"
              className="ml-1 sm:ml-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap text-xs"
            >
              💬 Atelier Help
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  // 2. Child Shop / Artisan / Staff Routes
  const isArtisanRoute = 
    currentPath.startsWith('/staff') || 
    currentPath.startsWith('/shop') || 
    currentPath.startsWith('/partner') || 
    role === 'child_shop';

  if (isArtisanRoute && !currentPath.startsWith('/admin')) {
    return (
      <header className="bg-slate-950 border-b border-indigo-900/60 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/shop/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl tracking-wider shadow-md">
              🧵
            </div>
            <div>
              <span className="font-extrabold tracking-wide text-white block text-sm sm:text-base leading-tight">
                MKTF BRANCH WORKSHOP
              </span>
              <span className="text-[10px] sm:text-xs text-indigo-400 font-semibold uppercase tracking-widest">
                Artisan Terminal Mode
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
            <Link
              href="/staff/branch-floor"
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                currentPath === '/staff/branch-floor' || currentPath.startsWith('/shop')
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              🧵 Active Floor Queue
            </Link>

            <Link
              href="/staff/school-projects"
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                currentPath.startsWith('/staff/school-projects')
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              🏫 School Projects
            </Link>

            <Link
              href={`/contact?role=child_shop&name=${encodeURIComponent(shopName || 'MKTF Child Shop')}`}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap text-xs"
            >
              💬 Support Desk
            </Link>

              </nav>
        </div>
      </header>
    );
  }

  // 3. Master Atelier Hub (Admin Only) — Clean Top Bar + Supabase-Style Hover Left Rail
  const primaryTopLinks = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/orders', label: 'Workshop Orders', icon: '📦' },
    { href: '/admin/support', label: 'Support Inbox', icon: '💬' },
  ];

  const sideRailLinks = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/orders', label: 'Workshop Orders', icon: '📦' },
    { href: '/admin/support', label: 'Support Inbox', icon: '💬' },
    { href: '/admin/school-projects', label: 'School Projects', icon: '🏫' },
    { href: '/admin/shops', label: 'Child Shops', icon: '🏪' },
    { href: '/admin/catalog', label: 'Catalog', icon: '🎨' },
    { href: '/staff/branch-floor', label: 'Artisan Floor', icon: '🧵' },
  ];

  return (
    <>
      <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 group-hover:bg-amber-400 flex items-center justify-center font-black text-slate-950 text-lg tracking-wider shadow-md transition shrink-0">
              MKTF
            </div>
            <div className="whitespace-nowrap">
              <span className="font-extrabold tracking-wide text-white block text-sm sm:text-base leading-tight group-hover:text-amber-400 transition">
                MKTF TAILORING
              </span>
              <span className="text-[10px] sm:text-xs text-amber-400 font-semibold uppercase tracking-widest block">
                Master Atelier Hub
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-xs sm:text-sm font-semibold shrink-0">
            {primaryTopLinks.map((link) => {
              const isActive =
                currentPath === link.href ||
                (link.href !== '/admin' && currentPath.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}

            <Link
              href="/order/new"
              className="ml-1 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <span>+ Intake Form</span>
              <span className="text-xs">↗</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Supabase-Style Collapsible Left Sidebar Rail (Expands on Cursor Hover) */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        aria-label="Admin Atelier Navigation Rail"
        className={`fixed top-16 left-0 bottom-0 z-40 hidden sm:flex flex-col justify-between bg-slate-950/95 backdrop-blur-md border-r border-slate-800/90 transition-all duration-200 ease-out shadow-2xl overflow-hidden ${
          sidebarHovered ? 'w-56' : 'w-14'
        }`}
      >
        <div className="py-3 px-2 space-y-1">
          {sideRailLinks.map((link) => {
            const isActive =
              currentPath === link.href ||
              (link.href !== '/admin' && currentPath.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span className="text-base w-5 text-center shrink-0">{link.icon}</span>
                <span
                  className={`transition-opacity duration-150 ${
                    sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="py-3 px-2 border-t border-slate-800/80 space-y-1">
          <Link
            href="/order/new"
            title="New Customer Intake"
            className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-extrabold text-amber-400 hover:bg-amber-500/10 transition whitespace-nowrap"
          >
            <span className="text-base w-5 text-center shrink-0">➕</span>
            <span
              className={`transition-opacity duration-150 ${
                sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              New Intake Form
            </span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition whitespace-nowrap cursor-pointer"
          >
            <span className="text-base w-5 text-center shrink-0">🚪</span>
            <span
              className={`transition-opacity duration-150 ${
                sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}