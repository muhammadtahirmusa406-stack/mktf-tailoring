'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ImageLightboxModal from '@/components/ui/image-lightbox-modal';
import { updateShopOrderStatusAction } from './actions';


  const formatDimensionLabel = (key: string, idx: number) => {
    // If it's already a clean string name
    if (!key.includes('-') && key.length < 25) {
      return key.replace(/_/g, ' ');
    }
    // Standard ordered dimension fallbacks for Hausa bespoke tailoring
    const defaultLabels = ['Neck (Wuya)', 'Chest (Gaba)', 'Sleeve (Hannu)', 'Kaftan Length', 'Trouser Length', 'Waist (Kugu)', 'Thigh', 'Cuff'];
    return defaultLabels[idx] || `Dimension #${idx + 1}`;
  };
  
export default function ShopFloorClient({ initialOrders, shopName, shopId }: any) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [filter, setFilter] = useState<string>('ALL');
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const stages = ['CUTTING', 'EMBROIDERY', 'SEWING', 'READY FOR PICKUP', 'COMPLETED'];

  const handleStageChange = async (orderId: string, nextStage: string) => {
    setLoadingId(orderId);
    try {
      const res = await updateShopOrderStatusAction(orderId, nextStage);
      if (res?.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStage } : o));
      } else {
        alert(res?.error || 'Failed to advance stage');
      }
    } catch (err: any) {
      alert('Error updating stage: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredOrders = filter === 'ALL'
    ? orders
    : orders.filter(o => o.status === filter);

  return (
    <div className="space-y-6">
      
      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            filter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          All Orders ({orders.length})
        </button>
        {stages.map(st => {
          const count = orders.filter(o => o.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filter === st ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((ord) => {
          const balance = Number(ord.total_price) - Number(ord.amount_paid);
          const isPaid = ord.payment_status === '100%_FULLY_PAID' || balance <= 0;
          const currentStageIdx = stages.indexOf(ord.status);
          const nextStage = stages[currentStageIdx + 1];

          return (
            <div
              key={ord.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between shadow-lg space-y-4"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Job Reference</span>
                    <p className="text-base font-black text-amber-400 font-mono">{ord.order_reference}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {ord.status}
                  </span>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-100">{ord.customer_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{ord.customer_phone}</p>
                  </div>

                  {/* Style Cut & Embroidery Design Previews */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ord.sewing_style_image_url && (
                      <div
                        onClick={() => setLightboxImg({ src: ord.sewing_style_image_url, title: `${ord.customer_name} - Style: ${ord.sewing_style_name_at_order || 'Cut'}` })}
                        className="cursor-pointer relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-950"
                        title="View Garment Cut"
                      >
                        <img src={ord.sewing_style_image_url} alt="Cut" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute top-0 left-0 bg-slate-900/80 text-[8px] font-bold text-slate-300 px-1 rounded-br">CUT</span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px]">
                          🔍
                        </div>
                      </div>
                    )}
                    {ord.design_image_url && (
                      <div
                        onClick={() => setLightboxImg({ src: ord.design_image_url, title: `${ord.customer_name} - Design: ${ord.design_name_at_order || ord.design_reference_at_order || 'Artwork'}` })}
                        className="cursor-pointer relative group w-12 h-12 rounded-lg overflow-hidden border border-amber-500/40 bg-slate-950"
                        title="View Embroidery Design"
                      >
                        <img src={ord.design_image_url} alt="Design" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute top-0 left-0 bg-amber-500/90 text-[8px] font-bold text-slate-950 px-1 rounded-br">ART</span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[10px]">
                          🔍
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Measurements Summary Chips */}
                {ord.customer_measurements && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">Artisan Dimensions</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {Object.entries(ord.customer_measurements).slice(0, 8).map(([k, v]: [string, any], idx: number) => (
                        <div key={k} className="p-1 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase block truncate">{formatDimensionLabel(k, idx)}</span>
                          <span className="font-bold text-amber-400 font-mono">{v}&quot;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Status Banner */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Balance:</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPaid ? '✓ Fully Settled' : `?${balance.toLocaleString()} Due`}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href={`/admin/orders/${ord.id}/print`}
                  target="_blank"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center border border-slate-700 transition"
                >
                  🖨️ Print Slip
                </Link>

                {nextStage ? (
                  <button
                    disabled={loadingId === ord.id}
                    onClick={() => handleStageChange(ord.id, nextStage)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold text-center transition shadow-sm"
                  >
                    {loadingId === ord.id ? 'Saving...' : `Advance → ${nextStage}`}
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
            No orders found under {filter} stage for this branch workshop.
          </div>
        )}
      </div>

      {/* Lightbox Preview */}
      <ImageLightboxModal
        src={lightboxImg?.src || null}
        alt={lightboxImg?.title}
        onClose={() => setLightboxImg(null)}
      />
    </div>
  );
}
