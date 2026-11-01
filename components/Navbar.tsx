'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mount, check pathname safely
  const currentPath = pathname || '';
  const isCustomerRoute = 
    currentPath.startsWith('/order') || 
    currentPath.startsWith('/track') || 
    currentPath.startsWith('/contact') || 
    role === 'customer';

  // 1. Customer-Facing Clean Navigation
  if (isCustomerRoute) {
    return (
      <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Customer Atelier Brand */}
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

          {/* Customer Action Links */}
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

            <a
              href="https://wa.me/2348030635560?text=Assalamu%20Alaikum%20MKTF%20Tailoring,%20I%20have%20an%20inquiry%20about%20my%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 sm:ml-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap text-xs"
            >
              💬 WhatsApp Help
            </a>
          </nav>

        </div>
      </header>
    );
  }

  // 2. Admin & Atelier Workshop Navigation
  const adminNavLinks = [
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
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-amber-500 group-hover:bg-amber-400 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider shadow-md transition">
            MKTF
          </div>
          <div>
            <span className="font-extrabold tracking-wide text-white block text-sm sm:text-base leading-tight group-hover:text-amber-400 transition">
              MKTF TAILORING
            </span>
            <span className="text-[10px] sm:text-xs text-amber-400 font-semibold uppercase tracking-widest">
              Master Atelier Hub
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold overflow-x-auto py-1">
          {adminNavLinks.map((link) => {
            const isActive = currentPath === link.href || (link.href !== '/admin' && currentPath.startsWith(link.href));
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
            className="ml-2 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1 shadow-sm whitespace-nowrap"
          >
            <span>+ Intake Form</span>
            <span className="text-xs">↗</span>
          </Link>
        </nav>

      </div>
    </header>
  );
}
