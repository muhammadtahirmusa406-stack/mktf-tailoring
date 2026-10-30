'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar({ role }: { role?: string }) {
  const pathname = usePathname();
  const isMaster = role === 'MASTER_ADMIN';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider shadow-md">
            MKTF
          </div>
          <div>
            <span className="font-extrabold tracking-wide text-white block text-sm sm:text-base leading-tight">
              MKTF TAILORING
            </span>
            <span className="text-[10px] sm:text-xs text-amber-400 font-semibold uppercase tracking-widest">
              Master Atelier & Production Hub
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold">
          <Link
            href="/admin/catalog"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            🎨 Catalog Studio
          </Link>

          <Link
            href="/admin/orders"
            className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
          >
            📦 Workshop Orders
          </Link>

          <Link
            href="/order/new"
            className="px-3 py-1.5 rounded-lg text-amber-300 hover:text-amber-200 transition flex items-center gap-1"
          >
            👁️ Customer Portal ↗
          </Link>
        </nav>
      </div>
    </header>
  );
}