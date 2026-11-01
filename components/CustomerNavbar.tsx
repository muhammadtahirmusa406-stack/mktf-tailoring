import Link from 'next/link';

export default function CustomerNavbar() {
  return (
    <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/order/new" className="flex items-center gap-3">
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

        {/* Customer Links Only */}
        <nav className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold">
          <Link
            href="/order/new"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 transition whitespace-nowrap"
          >
            ✨ Design Outfit
          </Link>

          <Link
            href="/track"
            className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition whitespace-nowrap"
          >
            📍 Track Garment
          </Link>

          <a
            href="https://wa.me/2348030635560?text=Assalamu%20Alaikum%20MKTF%20Tailoring,%20I%20have%20an%20inquiry%20about%20my%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 sm:ml-2 px-3 sm:px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap text-xs"
          >
            💬 WhatsApp Help
          </a>
        </nav>

      </div>
    </header>
  );
}
