'use client';

import { useState } from 'react';

export default function OutstandingBalanceCard({ amount }: { amount: number }) {
  const [show, setShow] = useState(false);

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
          Outstanding Balances
        </span>
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition"
          title={show ? 'Hide balance' : 'Show balance'}
          aria-label={show ? 'Hide balance' : 'Show balance'}
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>

      <div className="my-1">
        <p className="text-2xl font-black text-amber-400 tracking-tight">
          {show ? `₦${amount.toLocaleString()}` : '₦ ••••••••'}
        </p>
      </div>

      <span className="text-[11px] text-slate-500 block">Locked by delivery gate</span>
    </div>
  );
}
