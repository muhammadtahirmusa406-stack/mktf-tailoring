'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import ImageLightboxModal from '@/components/ui/image-lightbox-modal';

export default function TrackOrderPageClient({ order, rawQuery, searched }: any) {
  const [copied, setCopied] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && order?.order_reference) {
      setTrackingUrl(`${window.location.origin}/track?query=${order.order_reference}`);
    }
  }, [order?.order_reference]);

  const steps = [
    { key: 'CUTTING', label: 'Cutting Table', icon: '??' },
    { key: 'EMBROIDERY', label: 'Embroidery Unit', icon: '??' },
    { key: 'SEWING', label: 'Tailoring & Stitch', icon: '??' },
    { key: 'READY FOR PICKUP', label: 'Ready for Pickup', icon: '?' },
    { key: 'COMPLETED', label: 'Handover Completed', icon: '??' },
  ];

  const getStepIndex = (status: string) => {
    const s = (status || '').toUpperCase().trim();
    switch (s) {
      case 'NEW':
      case 'CONFIRMED':
      case 'CUTTING':
        return 0;
      case 'EMBROIDERY':
        return 1;
      case 'SEWING':
        return 2;
      case 'READY FOR PICKUP':
      case 'READY':
        return 3;
      case 'COMPLETED':
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : -1;

  const totalPrice = Number(order?.total_price) || 0;
  const amountPaid = Number(order?.amount_paid) || 0;
  const remainingBalance = Math.max(0, totalPrice - amountPaid);
  const isFullyPaid = remainingBalance <= 0 || order?.payment_status === '100%_FULLY_PAID';

  const copyLink = () => {
    if (trackingUrl) {
      navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>?</span> Live Atelier Garment Tracker
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Track Your Bespoke Order</h1>
          <p className="text-sm text-slate-400">
            Real-time workshop floor progress, artisan assignment, and pickup verification.
          </p>
        </div>

        {/* Search Bar */}
        <form method="GET" action="/track" className="relative flex items-center">
          <input
            type="text"
            name="query"
            defaultValue={rawQuery || ''}
            placeholder="Enter Order Reference (e.g., MKTF-KANO-12345) or Phone Number..."
            className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-md"
          >
            Track ??
          </button>
        </form>

        {searched && !order && (
          <div className="p-8 text-center rounded-2xl bg-slate-900/80 border border-rose-500/20 text-slate-300">
            <span className="text-3xl mb-2 block">??</span>
            <p className="font-bold text-rose-400">No active tailoring order found</p>
            <p className="text-xs text-slate-400 mt-1">Please double check your reference code or phone number.</p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            
            {/* Order Identity Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Order Reference</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xl font-black text-amber-400 font-mono">{order.order_reference}</span>
                    <button
                      onClick={copyLink}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                    >
                      {copied ? '? Copied' : '?? Copy Link'}
                    </button>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Client Name</span>
                  <p className="text-base font-bold text-slate-100 mt-0.5">{order.customer_name}</p>
                </div>
              </div>

                              {/* Garment Cut & Embroidery Previews with Fullscreen Lightbox */}
                {(order.sewing_style_image_url || order.design_image_url) && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
                    {order.sewing_style_image_url && (
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setLightboxImg({ src: order.sewing_style_image_url, title: order.sewing_style_name_at_order || 'Sewing Cut' })}
                          className="cursor-pointer relative group rounded-xl overflow-hidden border border-slate-700 w-14 h-14 flex-shrink-0 bg-slate-900"
                        >
                          <img src={order.sewing_style_image_url} alt="Sewing Cut" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <span className="absolute top-0 left-0 bg-slate-900/90 text-[8px] font-bold text-slate-300 px-1 rounded-br">CUT</span>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs">??</div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{order.sewing_style_name_at_order || 'Garment Cut'}</p>
                          <button
                            type="button"
                            onClick={() => setLightboxImg({ src: order.sewing_style_image_url, title: order.sewing_style_name_at_order || 'Sewing Cut' })}
                            className="text-[11px] text-amber-400 hover:underline font-semibold"
                          >
                            View cut photo
                          </button>
                        </div>
                      </div>
                    )}

                    {order.design_image_url && (
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setLightboxImg({ src: order.design_image_url, title: order.design_name || order.design_reference_at_order || 'Design' })}
                          className="cursor-pointer relative group rounded-xl overflow-hidden border border-amber-500/40 w-14 h-14 flex-shrink-0 bg-slate-900"
                        >
                          <img src={order.design_image_url} alt="Embroidery Design" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <span className="absolute top-0 left-0 bg-amber-500 text-[8px] font-bold text-slate-950 px-1 rounded-br">ART</span>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs">??</div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{order.design_name || order.design_reference_at_order || 'Embroidery Design'}</p>
                          <button
                            type="button"
                            onClick={() => setLightboxImg({ src: order.design_image_url, title: order.design_name || order.design_reference_at_order || 'Design' })}
                            className="text-[11px] text-amber-400 hover:underline font-semibold"
                          >
                            View embroidery photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Progress Stepper */}
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Workshop Production Pipeline</p>
                
                <div className="relative flex justify-between items-center">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
                  <div
                    className="absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 transition-all duration-500 z-0"
                    style={{ width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100}%` }}
                  />

                  {steps.map((st, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;
                    return (
                      <div key={st.key} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition ${
                            isCurrent
                              ? 'bg-amber-500 border-amber-300 text-slate-950 ring-4 ring-amber-500/20 scale-110 shadow-lg'
                              : isDone
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}
                        >
                          {isDone && !isCurrent ? '?' : st.icon}
                        </div>
                        <span
                          className={`text-[10px] sm:text-xs font-bold mt-2 text-center max-w-[70px] ${
                            isCurrent ? 'text-amber-400' : isDone ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Financial Status & Delivery Gate Notice */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Payment Summary & Release Gate</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] text-slate-500 uppercase font-bold">Total Bill</p>
                  <p className="text-xl font-black text-white mt-1">₦{totalPrice.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] text-slate-500 uppercase font-bold">Deposit Settled</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">₦{amountPaid.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] text-slate-500 uppercase font-bold">Balance Remaining</p>
                  <p className={`text-xl font-black mt-1 ${isFullyPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₦{remainingBalance.toLocaleString()}
                  </p>
                </div>
              </div>

                            {!isFullyPaid ? (
                <div className="mt-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Balance Payment Required for Release</h4>
                      <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                        Your outfit balance of <strong className="text-white font-mono font-bold">₦{remainingBalance.toLocaleString()}</strong> is outstanding. Transfer to:
                      </p>
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/20 text-xs font-mono text-slate-200">
                        <span className="text-amber-400 font-bold">OPay</span> • 8030635560 • Abdulrahman Aliyu
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/2348030635560?text=${encodeURIComponent(
                      `Hello Admin, I have settled the balance of ₦${remainingBalance.toLocaleString()} for my order #${order.order_reference}. Here is my payment receipt.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <span>💬</span> Send Payment Receipt via WhatsApp →
                  </a>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <span className="text-xl">?</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">100% Fully Settled</h4>
                    <p className="text-xs text-emerald-300 mt-0.5">Your order is cleared for immediate pickup once completed by the workshop floor.</p>
                  </div>
                </div>
              )}
            </div>

            {/* QR Code Handover Gate Slip */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-sm font-bold text-white">Workshop Verification Pass</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Present this QR code to the artisan or branch cashier to confirm garment release upon pickup.
                </p>
                <div className="pt-2">
                  <Link
                    href={`/admin/orders/${order.id}/print`}
                    target="_blank"
                    className="inline-block text-xs font-bold text-amber-400 hover:underline"
                  >
                    View Official Printable Job Slip ?
                  </Link>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl shadow-md">
                <QRCodeSVG value={trackingUrl || order.order_reference} size={110} level="M" />
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Universal Lightbox Modal */}
      <ImageLightboxModal
        src={lightboxImg?.src || null}
        alt={lightboxImg?.title}
        onClose={() => setLightboxImg(null)}
      />
    </div>
  );
}
