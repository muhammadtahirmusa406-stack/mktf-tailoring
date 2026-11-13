'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateOrderStatusAction, confirmFinalPaymentAction, assignOrderToShopAction, bulkAdvanceOrdersAction , sendCustomQuoteAction } from './actions';
import ImageLightboxModal from '@/components/ui/image-lightbox-modal';

const STAGES = ['CUTTING', 'EMBROIDERY', 'SEWING', 'READY FOR PICKUP', 'COMPLETED'];

export default function OrdersProgressionClient({
  initialOrders,
  availableShops = [],
}: {
  initialOrders: any[];
  availableShops?: any[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [activeFilter, setActiveFilter] = useState('ACTIVE');
  const [historySearch, setHistorySearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAdvance = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Advance all ${selectedIds.length} selected orders to their next respective stages?`)) return;

    setIsBulkLoading(true);
    const res = await bulkAdvanceOrdersAction(selectedIds);
    setIsBulkLoading(false);

    if (res.success) {
      if (res.errors && res.errors.length > 0) {
        alert(`Advanced ${res.advancedCount} orders.\n\nExceptions:\n` + res.errors.join('\n'));
      }
      setOrders((prev) =>
        prev.map((ord) => {
          if (!selectedIds.includes(ord.id)) return ord;
          const idx = STAGES.indexOf(ord.status);
          const next = STAGES[idx + 1];
          return next ? { ...ord, status: next } : ord;
        })
      );
      setSelectedIds([]);
    } else {
      alert('Bulk advance failed: ' + (res.errors?.join(', ') || 'Server error'));
    }
  };

    const handleConfirmPayment = async (orderId: string, totalPrice: number) => {
    if (!confirm('Confirm receipt of full payment balance for this order?')) return;
    setUpdatingId(orderId);
    try {
      const res = await confirmFinalPaymentAction(orderId, totalPrice);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, amount_paid: totalPrice, payment_status: '100%_FULLY_PAID' }
              : o
          )
        );
      } else {
        alert(res.error || 'Failed to update payment status');
      }
    } catch (e: any) {
      alert(e.message || 'An error occurred while confirming payment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    const res = await updateOrderStatusAction(orderId, nextStatus);
    setUpdatingId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } else {
      alert(res.error || 'Failed to update order status');
    }
  };

  const handleAssignShop = async (orderId: string, shopId: string) => {
    setUpdatingId(orderId);
    const res = await assignOrderToShopAction(orderId, shopId || null);
    setUpdatingId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, child_shop_id: shopId || null } : o))
      );
    } else {
      alert(res.error || 'Failed to assign child shop');
    }
  };

  // Separation: Active Pipeline vs Completed History
  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  // Filtered list for active cards
  const displayedActiveOrders =
    activeFilter === 'ACTIVE'
      ? activeOrders
      : activeOrders.filter((o) => o.status === activeFilter);

  // Search filtered list for completed history table
  const filteredCompletedOrders = completedOrders.filter((o) => {
    const q = historySearch.toLowerCase();
    return (
      (o.order_reference || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-10">
      
      {/* 1. ACTIVE PIPELINE SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>⚡</span> Active Workshop Floor ({activeOrders.length})
            </h2>
            <p className="text-xs text-slate-400">Garments currently in active production and dispatch stages.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeFilter === 'ACTIVE' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Active ({activeOrders.length})
            </button>
            {STAGES.filter((st) => st !== 'COMPLETED').map((st) => {
              const count = activeOrders.filter((o) => o.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setActiveFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    activeFilter === st ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedActiveOrders.map((ord) => {
            const balance = Number(ord.total_price || 0) - Number(ord.amount_paid || 0);
            const isPaid = ord.payment_status === '100%_FULLY_PAID' || balance <= 0;
            const currentStageIdx = STAGES.indexOf(ord.status);
            const nextStage = STAGES[currentStageIdx + 1];

            return (
              <div
                key={ord.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between shadow-lg space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ord.id)}
                        onChange={() => toggleSelectOrder(ord.id)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">ORDER ID</span>
                        <p className="text-sm font-black text-amber-400 font-mono">{ord.order_reference}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {ord.status || 'NEW'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{ord.customer_name || 'Walk-in Client'}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{ord.customer_phone || 'N/A'}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {ord.sewing_style_image_url && (
                        <div
                          onClick={() => setLightboxImg({ src: ord.sewing_style_image_url, title: `${ord.customer_name} - Style` })}
                          className="cursor-pointer w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-950"
                        >
                          <img src={ord.sewing_style_image_url} alt="Style" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {ord.design_image_url && (
                        <div
                          onClick={() => setLightboxImg({ src: ord.design_image_url, title: `${ord.customer_name} - Artwork` })}
                          className="cursor-pointer w-10 h-10 rounded-lg overflow-hidden border border-amber-500/40 bg-slate-950"
                        >
                          <img src={ord.design_image_url} alt="Artwork" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Custom Design Quote & In-App Negotiation Panel */}
                  {ord.is_custom_design && (ord.status === 'PENDING_QUOTE' || ord.status === 'QUOTE_SENT' || ord.status === 'COUNTER_OFFER' || ord.status === 'QUOTE_ACCEPTED') && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-400 uppercase tracking-wider text-[10px]">
                          ✨ Custom Design Quote ({ord.quote_status || ord.status})
                        </span>
                        {ord.design_image_url && (
                          <button
                            type="button"
                            onClick={() => setLightboxImg({ src: ord.design_image_url, title: `${ord.customer_name} - Custom Design` })}
                            className="text-[10px] font-bold text-amber-300 underline cursor-pointer"
                          >
                            Inspect Sample
                          </button>
                        )}
                      </div>

                      {ord.custom_design_notes && (
                        <p className="text-[11px] text-slate-300 italic">&ldquo;{ord.custom_design_notes}&rdquo;</p>
                      )}

                      {Array.isArray(ord.negotiation_thread) && ord.negotiation_thread.length > 0 && (
                        <div className="max-h-28 overflow-y-auto space-y-1.5 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                          {ord.negotiation_thread.map((msg: any, idx: number) => (
                            <div key={msg.id || idx} className="text-[10px] leading-snug">
                              <span className={`font-bold uppercase ${msg.sender === 'admin' ? 'text-emerald-400' : 'text-amber-300'}`}>
                                {msg.sender === 'admin' ? 'Atelier' : 'Client'}
                              </span>
                              {msg.amount ? <span className="font-mono font-bold text-white"> (₦{Number(msg.amount).toLocaleString()})</span> : null}
                              {msg.message ? <span className="text-slate-300">: {msg.message}</span> : null}
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const priceVal = Number(fd.get('quotedPrice'));
                          const noteVal = String(fd.get('quoteNote') || '');
                          if (!priceVal || priceVal <= 0) {
                            alert('Enter a valid quote amount.');
                            return;
                          }
                          setUpdatingId(ord.id);
                          const res = await sendCustomQuoteAction(ord.id, priceVal, noteVal);
                          setUpdatingId(null);
                          if (!res.success) {
                            alert(res.error || 'Failed to send quote.');
                          } else {
                            setOrders((prev) =>
                              prev.map((item) =>
                                item.id === ord.id
                                  ? {
                                      ...item,
                                      total_price: priceVal,
                                      status: 'QUOTE_SENT',
                                      quote_status: 'QUOTE_SENT',
                                      negotiation_thread: [
                                        ...(Array.isArray(item.negotiation_thread) ? item.negotiation_thread : []),
                                        { sender: 'admin', amount: priceVal, message: noteVal || `Quote set to ₦${priceVal.toLocaleString()}` },
                                      ],
                                    }
                                  : item
                              )
                            );
                          }
                        }}
                        className="space-y-1.5 pt-1"
                      >
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            name="quotedPrice"
                            defaultValue={ord.total_price > 0 ? ord.total_price : ''}
                            placeholder="Set Quote (₦)"
                            className="w-1/2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                          />
                          <input
                            type="text"
                            name="quoteNote"
                            placeholder="Note to client..."
                            className="w-1/2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={updatingId === ord.id}
                          className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition cursor-pointer"
                        >
                          {updatingId === ord.id ? 'Sending Quote...' : 'Send / Update Quote to Client'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Branch Assignment Selector */}
                  <div className="mt-3">
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Assigned Workshop Branch
                    </label>
                    <select
                      value={ord.child_shop_id || ''}
                      disabled={updatingId === ord.id}
                      onChange={(e) => handleAssignShop(ord.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Unassigned (Central Queue) --</option>
                      {availableShops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.location || 'Branch'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price, Balance & Delivery Request */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Price</span>
                      <span className="font-bold text-slate-200 font-mono">₦{Number(ord.total_price || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Due</span>
                      <span className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPaid ? '✓ 100% Settled' : `₦${balance.toLocaleString()} Due`}
                      </span>
                    </div>
                  </div>

                  {(ord.status === 'READY FOR PICKUP' || ord.status === 'COMPLETED') && (
                    ord.delivery_method === 'delivery' ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 space-y-1">
                      <div className="font-black text-amber-400 text-[11px] uppercase tracking-wider">
                        🚚 Delivery Requested by Customer
                      </div>
                      {(ord.delivery_state || ord.delivery_lga) && (
                        <p className="text-[11px] font-bold text-amber-200">
                          {[ord.delivery_lga ? `${ord.delivery_lga} LGA` : null, ord.delivery_state ? `${ord.delivery_state} State` : null].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-200">{ord.delivery_address}</p>
                      {ord.delivery_phone && (
                        <p className="text-[11px] text-amber-300 font-mono">
                          Primary Tel: <a href={`tel:${ord.delivery_phone}`} className="underline">{ord.delivery_phone}</a>
                        </p>
                      )}
                      {ord.delivery_alt_phone && (
                        <p className="text-[11px] text-emerald-300 font-mono">
                          In-Case Tel: <a href={`tel:${ord.delivery_alt_phone}`} className="underline">{ord.delivery_alt_phone}</a>
                        </p>
                      )}
                      {ord.delivery_notes && (
                        <p className="text-[10px] text-slate-400">Note: {ord.delivery_notes}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Handover Mode:</span>
                      <span className="font-bold text-slate-300">🏪 In-Shop Pickup</span>
                    </div>
                  )
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-2">
                      <Link
                    href={`/admin/orders/${ord.id}/print`}
                    target="_blank"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center border border-slate-700 transition"
                  >
                    🖨️ Job Slip
                  </Link>

                    </div>

                  {nextStage ? (
                    <button
                      disabled={updatingId === ord.id}
                      onClick={() => handleStatusChange(ord.id, nextStage)}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black text-center transition"
                    >
                      {updatingId === ord.id ? 'Saving...' : `Advance → ${nextStage}`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {displayedActiveOrders.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
              No active orders currently pending on the workshop floor.
            </div>
          )}
        </div>
      </section>

      {/* 2. COMPLETED ORDERS HISTORY SECTION */}
      <section className="space-y-4 pt-6 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-emerald-400 flex items-center gap-2">
              <span>📦</span> Workshop Orders History ({completedOrders.length})
            </h2>
            <p className="text-xs text-slate-400">Archived archive of garments finished, delivered, and finalized.</p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search history by ref or client..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Client Name</th>
                <th className="p-4">Workshop Branch</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Completed Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCompletedOrders.map((ord) => {
                const assignedShop = availableShops.find((s) => s.id === ord.child_shop_id);
                const formattedDate = ord.created_at
                  ? new Date(ord.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'N/A';

                return (
                  <tr key={ord.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-amber-400">
                      {ord.order_reference}
                    </td>
                    <td className="p-4 font-semibold text-white">
                      {ord.customer_name || 'Walk-in Client'}
                      {ord.customer_phone && <span className="block text-[10px] text-slate-500 font-mono">{ord.customer_phone}</span>}
                    </td>
                    <td className="p-4 text-slate-400">
                      {assignedShop ? assignedShop.name : 'Central Queue'}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-200">
                      ₦{Number(ord.total_price || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✓ Settled
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {formattedDate}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/orders/${ord.id}/print`}
                        target="_blank"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 transition"
                      >
                        🖨️ Slip
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredCompletedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No completed order history records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <ImageLightboxModal src={lightboxImg.src} alt={lightboxImg.title} onClose={() => setLightboxImg(null)} />
      )}

    </div>
  );
}
