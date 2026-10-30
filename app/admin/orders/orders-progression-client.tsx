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
  const [activeFilter, setActiveFilter] = useState('ALL');
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

  const toggleSelectAll = (filteredList: any[]) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((o) => o.id));
    }
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
      // Optimistically step selected orders to their next stage
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

  const handleCashierSettlement = async (orderId: string, totalPrice: number) => {
    if (!confirm('Confirm receipt of full remaining cash balance for this order?')) return;

    setUpdatingId(orderId);
    const res = await confirmFinalPaymentAction(orderId, totalPrice);
    setUpdatingId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, amount_paid: totalPrice, payment_status: '100%_FULLY_PAID' }
            : o
        )
      );
    } else {
      alert(res.error || 'Failed to record payment');
    }
  };

  const filteredOrders =
    activeFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Bulk Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        
        {/* Stage Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All Orders ({orders.length})
          </button>
          {STAGES.map((st) => {
            const count = orders.filter((o) => o.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setActiveFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeFilter === st
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleSelectAll(filteredOrders)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition"
          >
            {selectedIds.length === filteredOrders.length && filteredOrders.length > 0
              ? 'Deselect All'
              : 'Select All Visible'}
          </button>

          {selectedIds.length > 0 && (
            <button
              disabled={isBulkLoading}
              onClick={handleBulkAdvance}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5"
            >
              <span>⚡ Advance Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>

      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((ord) => {
          const totalPrice = Number(ord.total_price) || 0;
          const balance = totalPrice - Number(ord.amount_paid || 0);
          const isPaid = ord.payment_status === '100%_FULLY_PAID' || balance <= 0;
          const currentStageIdx = STAGES.indexOf(ord.status);
          const nextStage = STAGES[currentStageIdx + 1];
          const isSelected = selectedIds.includes(ord.id);

          return (
            <div
              key={ord.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition flex flex-col justify-between shadow-lg space-y-4 ${
                isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header: Checkbox + Reference + Status */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOrder(ord.id)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Order ID</span>
                      <p className="text-base font-black text-amber-400 font-mono leading-tight">{ord.order_reference}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {ord.status}
                  </span>
                </div>

                {/* Customer Info & Image Thumbnail */}
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{ord.customer_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{ord.customer_phone}</p>
                  </div>

                  {ord.design_image_url && (
                    <div
                      onClick={() =>
                        setLightboxImg({
                          src: ord.design_image_url,
                          title: `${ord.customer_name} - ${ord.design_name || 'Design Reference'}`,
                        })
                      }
                      className="cursor-pointer relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0"
                    >
                      <img
                        src={ord.design_image_url}
                        alt="Style"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px]">
                        🔍
                      </div>
                    </div>
                  )}
                </div>

                {/* Branch Routing Dropdown */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label htmlFor={`shop-select-${ord.id}`} className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Assigned Workshop Branch
                  </label>
                  <select
                    id={`shop-select-${ord.id}`}
                    value={ord.child_shop_id || ''}
                    disabled={updatingId === ord.id}
                    onChange={(e) => handleAssignShop(ord.id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Unassigned (Central Queue) --</option>
                    {availableShops.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.name} {sh.location ? `(${sh.location})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Financial Overview */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Price</span>
                    <span className="font-bold text-slate-200">₦{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Balance Due</span>
                    <span className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPaid ? '✓ 100% Settled' : `₦${balance.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {!isPaid && (
                  <button
                    disabled={updatingId === ord.id}
                    onClick={() => handleCashierSettlement(ord.id, totalPrice)}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
                  >
                    💰 Cashier: Settle ₦{balance.toLocaleString()}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/admin/orders/${ord.id}/print`}
                    target="_blank"
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center border border-slate-700 transition"
                  >
                    🖨️ Job Slip
                  </Link>

                  {nextStage ? (
                    <button
                      disabled={updatingId === ord.id}
                      onClick={() => handleStatusChange(ord.id, nextStage)}
                      className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition text-center shadow-sm"
                    >
                      {updatingId === ord.id ? 'Saving...' : `Advance → ${nextStage}`}
                    </button>
                  ) : (
                    <span className="py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center border border-emerald-500/20">
                      Completed ✓
                    </span>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            No orders found under {activeFilter} stage.
          </div>
        )}
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      <ImageLightboxModal
        src={lightboxImg?.src || null}
        alt={lightboxImg?.title}
        onClose={() => setLightboxImg(null)}
      />
    </div>
  );
}
