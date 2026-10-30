'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateOrderStatusAction } from '@/app/admin/orders/actions';
import { logoutStaffAction } from '../actions';
import ImageLightboxModal from '@/components/ui/image-lightbox-modal';

export default function BranchFloorClient({
  orders: ordersProp,
  initialOrders,
  branchName,
  shopId,
  profile,
}: any) {
  const [orders, setOrders] = useState<any[]>(ordersProp || initialOrders || []);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  const STAGES = ['CUTTING', 'EMBROIDERY', 'SEWING', 'READY FOR PICKUP', 'COMPLETED'];

  const handleAdvance = async (orderId: string, currentStatus: string) => {
    const currentIndex = STAGES.indexOf(currentStatus);
    const nextStatus = STAGES[currentIndex + 1] || 'READY FOR PICKUP';

    setUpdatingId(orderId);
    const res = await updateOrderStatusAction(orderId, nextStatus);
    setUpdatingId(null);

    if (res && !res.success) {
      alert(res.error || 'Failed to update order status');
      return;
    }

    setOrders((prev: any[]) =>
      (prev || []).map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  const filteredOrders = activeFilter === 'ALL'
    ? (orders || [])
    : (orders || []).filter((o) => o.status === activeFilter);

  const displayName = branchName || profile?.branch_name || profile?.shop_name || 'Workshop Floor';

  return (
    <div className="space-y-6">
      
      {/* Branch Floor Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
            Active Workstation
          </span>
          <h2 className="text-lg font-bold text-white">{displayName}</h2>
          <p className="text-xs text-slate-400">
            Queue: {(orders || []).length} active tailoring orders assigned to this floor
          </p>
        </div>

        <form action={logoutStaffAction}>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
          >
            Sign Out 🚪
          </button>
        </form>
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          All Floor Orders ({(orders || []).length})
        </button>
        {STAGES.map((st) => {
          const count = (orders || []).filter((o) => o.status === st).length;
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

      {/* Orders Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order: any) => {
          const m = order.customer_measurements || {};
          const isUpdating = updatingId === order.id;

          const totalPrice = Number(order.total_price) || 0;
          const amountPaid = Number(order.amount_paid) || 0;
          const balance = totalPrice - amountPaid;
          const isFullyPaid = order.payment_status === '100%_FULLY_PAID' || balance <= 0;

          const currentStageIdx = STAGES.indexOf(order.status);
          const nextStage = STAGES[currentStageIdx + 1];

          return (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between shadow-lg space-y-4"
            >
              <div>
                {/* Header Reference & Status */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Job Reference</span>
                    <p className="text-base font-black text-amber-400 font-mono">{order.order_reference}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {order.status}
                  </span>
                </div>

                {/* Customer Info & Photo Lightbox */}
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{order.customer_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{order.customer_phone}</p>
                  </div>

                  {order.design_image_url && (
                    <div
                      onClick={() =>
                        setLightboxImg({
                          src: order.design_image_url,
                          title: `${order.customer_name} - ${order.design_name || 'Design Reference'}`,
                        })
                      }
                      className="cursor-pointer relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0"
                    >
                      <img
                        src={order.design_image_url}
                        alt="Style"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px]">
                        🔍
                      </div>
                    </div>
                  )}
                </div>

                {/* Cutting Dimensions */}
                {Object.keys(m).length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">Artisan Dimensions</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {Object.entries(m).slice(0, 6).map(([k, v]: [string, any]) => (
                        <div key={k} className="p-1 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase block truncate">{k.replace('_', ' ')}</span>
                          <span className="font-bold text-amber-400 font-mono">{v}&quot;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Status Banner */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Balance:</span>
                  <span className={`font-bold ${isFullyPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isFullyPaid ? '✓ Fully Settled' : `₦${balance.toLocaleString()} Due`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <Link
                  href={`/admin/orders/${order.id}/print`}
                  target="_blank"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center border border-slate-700 transition"
                >
                  🖨️ Job Slip
                </Link>

                {nextStage ? (
                  <button
                    disabled={isUpdating}
                    onClick={() => handleAdvance(order.id, order.status)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold text-center transition shadow-sm"
                  >
                    {isUpdating ? 'Saving...' : `Advance → ${nextStage}`}
                  </button>
                ) : (
                  <span className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center border border-emerald-500/20">
                    Completed ✓
                  </span>
                )}
              </div>

            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            No orders queued under {activeFilter} stage for this branch.
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
