'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSchoolProjectAction } from './actions';

export default function CreateProjectClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await createSchoolProjectAction(formData);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to initialize school project');
        setLoading(false);
        return;
      }

      if (res.projectId) {
        router.push(`/admin/school-projects/${res.projectId}`);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred while creating project.');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
      <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
        <span>✨</span> Onboard New School Project
      </h2>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              School / Institution Name *
            </label>
            <input
              type="text"
              name="school_name"
              required
              placeholder="e.g. Dutse Model Science Academy"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs outline-none transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              Contact Phone
            </label>
            <input
              type="text"
              name="contact_phone"
              placeholder="e.g. 0803XXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white text-xs outline-none transition"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              Uniform Sample Photo (Style/Collar)
            </label>
            <input
              type="file"
              name="uniform_sample"
              accept="image/*"
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating Workspace...' : '+ Launch School Project Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
}
