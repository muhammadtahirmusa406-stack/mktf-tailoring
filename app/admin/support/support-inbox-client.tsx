'use client';

import React, { useState } from 'react';
import { replyToSupportInquiryAction } from './actions';

export default function SupportInboxClient({ initialInquiries }: { initialInquiries: any[] }) {
  const [inquiries, setInquiries] = useState<any[]>(initialInquiries || []);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'REPLIED' | 'RESOLVED'>('ALL');

  const filtered = inquiries.filter((i) => filter === 'ALL' || i.status === filter);

  const handleReply = async (item: any, status: 'REPLIED' | 'RESOLVED') => {
    const text = (replyDrafts[item.id] ?? item.admin_reply ?? '').trim();
    if (!text) {
      alert('Please write a response before sending.');
      return;
    }
    setSavingId(item.id);
    const res = await replyToSupportInquiryAction(item.id, text, status);
    setSavingId(null);
    if (!res.success) {
      alert(res.error || 'Failed to save reply.');
      return;
    }
    setInquiries((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, admin_reply: text, status, replied_at: new Date().toISOString() } : row
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
              In-App Atelier Concierge
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              Customer &amp; Branch Support Inbox
            </h1>
          </div>

          <div className="flex gap-2 text-xs font-bold">
            {(['ALL', 'OPEN', 'REPLIED', 'RESOLVED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                  filter === tab
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-sm">
            No support inquiries in this queue.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      {item.ticket_reference}
                    </span>
                    <span className="font-bold text-white text-sm">{item.sender_name}</span>
                    <a href={`tel:${item.sender_phone}`} className="text-xs font-mono text-sky-400 underline">
                      {item.sender_phone}
                    </a>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    item.status === 'OPEN'
                      ? 'bg-amber-500/20 text-amber-300'
                      : item.status === 'REPLIED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-300">{item.topic}</div>
                <p className="text-sm text-slate-200 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 m-0">
                  {item.message}
                </p>

                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={replyDrafts[item.id] ?? item.admin_reply ?? ''}
                    onChange={(e) => setReplyDrafts({ ...replyDrafts, [item.id]: e.target.value })}
                    placeholder="Write official atelier response..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => handleReply(item, 'REPLIED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                    >
                      {savingId === item.id ? 'Saving...' : 'Send In-App Reply'}
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => handleReply(item, 'RESOLVED')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}