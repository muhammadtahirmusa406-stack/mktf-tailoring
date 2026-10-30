'use client';

import React, { useState } from 'react';
import { uploadSewingStyleAction, deleteSewingStyleAction } from './actions';
import ImageLightboxModal from '@/components/ui/image-lightbox-modal';

export default function SewingStylesManager({ initialStyles }: { initialStyles: any[] }) {
  const [styles, setStyles] = useState(initialStyles);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  const handleDelete = async (styleId: string, styleName: string) => {
    if (!confirm(`Permanently delete "${styleName}" from your atelier catalog?`)) return;

    setDeletingId(styleId);
    const res = await deleteSewingStyleAction(styleId);
    setDeletingId(null);

    if (res && !res.success) {
      alert('Delete failed: ' + res.error);
    } else {
      setStyles((prev) => prev.filter((s) => s.id !== styleId));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>✂️</span> Bespoke Sewing Cuts & Styles
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your master cuts (Babban Riga, Kaftan, Jalabiya) and tailoring base fees.
          </p>
        </div>
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          {styles.length} Styles Active
        </span>
      </div>

      {/* Upload Form */}
      <form action={uploadSewingStyleAction} className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label htmlFor="style-name-input" className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Style Name</label>
          <input
            id="style-name-input"
            name="name"
            required
            placeholder="e.g. Modern Kaftan"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="style-price-input" className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Base Tailoring Fee (₦)</label>
          <input
            id="style-price-input"
            name="base_price"
            type="number"
            required
            placeholder="15000"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label htmlFor="style-image-input" className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Style Photo</label>
          <input
            id="style-image-input"
            name="image"
            type="file"
            accept="image/*"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-amber-500 file:text-slate-950"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-sm"
        >
          + Save Style
        </button>
      </form>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {styles.map((style) => (
          <div
            key={style.id}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
          >
            <div>
              {style.image_url ? (
                <div
                  onClick={() => setLightboxImg({ src: style.image_url, title: style.name })}
                  className="cursor-pointer relative group aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900 mb-2.5"
                >
                  <img src={style.image_url} alt={style.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                    🔍 View Full
                  </span>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs mb-2.5">
                  No Image
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-white">{style.name}</h3>
                <span className="text-xs font-extrabold text-amber-400">
                  ₦{(style.sewing_charge || style.base_price || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              disabled={deletingId === style.id}
              onClick={() => handleDelete(style.id, style.name)}
              className="w-full py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/20 transition disabled:opacity-50"
            >
              {deletingId === style.id ? 'Deleting...' : '🗑️ Delete Style'}
            </button>
          </div>
        ))}

        {styles.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 text-xs">
            No sewing styles registered yet. Use the form above to add your first cut.
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
