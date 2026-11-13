'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitSupportInquiryAction, lookupSupportInquiriesAction } from './actions';

const FAQS = [
  {
    q: 'How long does a standard bespoke outfit take?',
    a: 'Standard crafting takes 3–5 working days from deposit verification. You can monitor every stage (Cutting, Embroidery, Tailoring & Stitch, Ready for Pickup) live on the Track Order page.',
  },
  {
    q: 'What if I do not see my preferred embroidery design in the catalogue?',
    a: 'Select "Have Your Own Design? Upload Photo for Custom Quote" on Step 1 of the Design Order page. Upload your picture, submit your measurements free, and negotiate the price directly in-app before paying your 50% or 100% deposit.',
  },
  {
    q: 'How do payment deposits and balance settlement work?',
    a: 'You may start your order with a 50% commitment deposit or 100% full payment. Any remaining 50% balance is settled online via verified bank transfer between Tailoring & Stitch and Ready for Pickup.',
  },
  {
    q: 'Do you offer doorstep delivery once my garment is ready?',
    a: 'Yes. Once your order is 100% settled and reaches Ready for Pickup, an optional delivery form unlocks on your Track Order page where you can enter your State, LGA, Street Address, and Alternative Phone Number.',
  },
];

export default function ContactPage() {
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [topic, setTopic] = useState('General Tailoring Inquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [lookupQuery, setLookupQuery] = useState('');
  const [searchingTickets, setSearchingTickets] = useState(false);
  const [tickets, setTickets] = useState<any[] | null>(null);

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setCreatedTicket(null);

    if (!senderName.trim() || !senderPhone.trim() || !message.trim()) {
      setSubmitError('Please fill in your name, phone number, and message.');
      return;
    }

    setSubmitting(true);
    const res = await submitSupportInquiryAction({
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      topic,
      message: message.trim(),
    });
    setSubmitting(false);

    if (!res.success) {
      setSubmitError(res.error || 'Failed to send inquiry.');
      return;
    }

    setCreatedTicket(res.ticketReference || 'SUBMITTED');
    setLookupQuery(senderPhone.trim());
    setMessage('');
  };

  const handleLookupTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    setSearchingTickets(true);
    const res = await lookupSupportInquiriesAction(lookupQuery.trim());
    setSearchingTickets(false);
    setTickets(res.inquiries || []);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-extrabold tracking-widest uppercase">
            In-App Atelier Concierge &amp; Support
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            How Can Our Master Tailors Help?
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto">
            Get instant answers below, send a tracked message directly to our workshop desk, or check replies to your inquiries—all inside MKTF Tailoring.
          </p>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: FAQ + Ticket Reply Lookup */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick FAQ Accordion */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
                ⚡ Quick Answers &amp; Workshop Policies
              </h2>
              <div className="space-y-2">
                {FAQS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <span className="text-amber-400 font-mono">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3 text-xs text-slate-400 leading-relaxed border-t border-slate-800/70 pt-2">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Check Replies Box */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                📬 Check Atelier Replies
              </h2>
              <p className="text-xs text-slate-400">
                Enter your phone number or <span className="font-mono text-slate-200">SUP-...</span> ticket ID to view responses from our workshop.
              </p>
              <form onSubmit={handleLookupTickets} className="flex gap-2">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Phone or SUP-XXXXXX"
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searchingTickets}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  {searchingTickets ? '...' : 'Check'}
                </button>
              </form>

              {tickets !== null && (
                <div className="space-y-2.5 pt-2 max-h-64 overflow-y-auto">
                  {tickets.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No support tickets found for that phone or reference.</p>
                  ) : (
                    tickets.map((t: any) => (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-400">{t.ticket_reference}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${t.admin_reply ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="font-bold text-slate-300">{t.topic}</div>
                        <p className="text-slate-400 m-0">{t.message}</p>
                        {t.admin_reply ? (
                          <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-200">
                            <span className="text-[10px] font-black uppercase text-emerald-400 block mb-0.5">Master Tailor Reply:</span>
                            {t.admin_reply}
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-400/80 italic">Awaiting workshop response...</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Direct Workshop Phone Lines (Voice Call) */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2 text-xs">
              <div className="font-black uppercase tracking-wider text-slate-400 text-[10px]">Urgent Voice Lines</div>
              <div className="flex flex-wrap gap-3 text-slate-200 font-mono">
                <a href="tel:08030635560" className="underline hover:text-amber-400">0803 063 5560</a>
                <span>•</span>
                <a href="tel:09116405923" className="underline hover:text-amber-400">0911 640 5923</a>
                <span>•</span>
                <a href="tel:09070964922" className="underline hover:text-amber-400">0907 096 4922</a>
              </div>
            </div>
          </div>

          {/* Right Column: In-App Support Ticket Form */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Direct Atelier Ticket</span>
              <h2 className="text-xl font-black text-white mt-1">Message the Master Tailor</h2>
              <p className="text-xs text-slate-400 mt-1">
                Every inquiry gets a tracked ticket ID so our team can respond with full order context.
              </p>
            </div>

            {createdTicket && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
                <div className="font-black text-emerald-300">✓ Inquiry Logged — Ticket #{createdTicket}</div>
                <p className="m-0">
                  Our workshop team has received your message. Use your phone number in the &ldquo;Check Atelier Replies&rdquo; box on this page anytime to view our reply.
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 font-bold">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSendInquiry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Ibrahim Lawal"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. 0803 123 4567"
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Topic / Inquiry Category
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="General Tailoring Inquiry">General Tailoring Inquiry</option>
                  <option value="Custom Design & Quote Question">Custom Design &amp; Quote Question</option>
                  <option value="Measurements & Fitting Help">Measurements &amp; Fitting Help</option>
                  <option value="Order Status & Delivery">Order Status &amp; Delivery</option>
                  <option value="Bulk / School / Ceremonial Order">Bulk / School / Ceremonial Order</option>
                  <option value="Payment & Receipt Verification">Payment &amp; Receipt Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Your Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your question, order reference (ORD-...), or special tailoring request..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Link href="/track" className="text-xs font-bold text-slate-400 hover:text-amber-400">
                  Have an Order ID? Negotiate or Track on /track →
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {submitting ? 'Submitting Inquiry...' : 'Submit In-App Inquiry →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}