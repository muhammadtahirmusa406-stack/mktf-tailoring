'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = profile?.role || 'customer';
      setRole(userRole);

      if (userRole === 'child_shop') {
        const { data: shop } = await supabase
          .from('child_shops')
          .select('name')
          .eq('owner_profile_id', user.id)
          .maybeSingle();
        if (shop) {
          setShopName(shop.name);
        }
      }
      setLoading(false);
    }

    loadUserRole();
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isAdmin = role === 'admin' || role === 'MASTER_ADMIN';
  const isChildShop = role === 'child_shop';

  const adminLinks = [
    { href: '/admin', label: '📊 Dashboard' },
    { href: '/admin/orders', label: '📦 Workshop Orders' },
    { href: '/admin/shops', label: '🏪 Child Shops' },
    { href: '/admin/catalog', label: '🎨 Catalog' },
    { href: '/staff/branch-floor', label: '🧵 Artisan Floor' },
  ];

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href={isChildShop ? '/shop/dashboard' : '/admin'} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-amber-500 group-hover:bg-amber-400 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider shadow-md transition">
            MKTF
          </div>
          <div>
            <span className="font-extrabold tracking-wide text-white block text-sm sm:text-base leading-tight group-hover:text-amber-400 transition">
              MKTF TAILORING
            </span>
            <span className="text-[10px] sm:text-xs text-amber-400 font-semibold uppercase tracking-widest">
              {isChildShop ? (shopName ? `${shopName} Floor` : 'Branch Workshop') : 'Master Atelier Hub'}
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-2">
          {/* Admin Navigation */}
          {isAdmin && (
            <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold overflow-x-auto py-1">
              {adminLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <Link
                href="/order/new"
                target="_blank"
                className="ml-2 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1 shadow-sm whitespace-nowrap"
              >
                <span>+ Intake Form ↗</span>
              </Link>
            </nav>
          )}

          {/* Child Shop Navigation */}
          {isChildShop && (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Floor Terminal Online
              </span>

              <button
                onClick={handleSignOut}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 hover:border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>Sign Out 🚪</span>
              </button>
            </div>
          )}

          {/* Public / Unauthenticated fallback */}
          {!isAdmin && !isChildShop && !loading && (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              Sign In 🔑
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
