'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateOrderStatusAction, confirmFinalPaymentAction, assignOrderToShopAction, bulkAdvanceOrdersAction } from './actions';
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

                {/* Price and Balance */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
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

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href={`/admin/orders/${ord.id}/print`}
                    target="_blank"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center border border-slate-700 transition"
                  >
                    🖨️ Job Slip
                  </Link>

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
