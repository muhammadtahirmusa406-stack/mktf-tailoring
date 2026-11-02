'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { branchCompleteStudentAction } from './actions';

interface AssignedStudent {
  id: string;
  project_id: string;
  student_name: string;
  sets_count: number;
  kafada: number;
  hannu: number;
  riga: number;
  wando: number;
  status: string;
  return_reason: string | null;
  school_name: string;
  uniform_sample_image_url: string | null;
}

export default function BranchProjectsClient({
  shop,
  initialStudents,
}: {
  shop: any;
  initialStudents: AssignedStudent[];
}) {
  const [students, setStudents] = useState<AssignedStudent[]>(initialStudents);
  const [filter, setFilter] = useState<'PENDING' | 'DONE' | 'ALL'>('PENDING');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleComplete = async (studentId: string, projectId: string) => {
    setUpdatingId(studentId);
    try {
      const res = await branchCompleteStudentAction(studentId, projectId);
      if (res.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, status: 'DONE' } : s))
        );
      } else {
        alert(res.error || 'Failed to update uniform status');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // Distinct parent school projects assigned to this branch
  const projectsMap = new Map<string, { school_name: string; uniform_sample_image_url: string | null }>();
  students.forEach((s) => {
    if (!projectsMap.has(s.project_id)) {
      projectsMap.set(s.project_id, {
        school_name: s.school_name,
        uniform_sample_image_url: s.uniform_sample_image_url,
      });
    }
  });

  const pending = students.filter((s) => s.status === 'PENDING' || s.status === 'RETURNED');
  const done = students.filter((s) => s.status === 'DONE');
  const displayed = filter === 'ALL' ? students : filter === 'PENDING' ? pending : done;

  return (
    <div className="space-y-6">
      
      {/* Branch Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">
            {shop.name} Workshop Floor
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            School Uniform Production Queue
          </h1>
          <p className="text-xs text-slate-400">
            Assigned institutional contracts. All students follow the master uniform sample style.
          </p>
        </div>

        <Link
          href="/staff/branch-floor"
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition self-start sm:self-auto"
        >
          ← Bespoke Orders Floor
        </Link>
      </div>

      {/* PINNED MASTER UNIFORM SAMPLE BANNERS (One Sample Picture Per Project) */}
      <div className="space-y-4">
        {Array.from(projectsMap.entries()).map(([projId, proj]) => (
          <div
            key={projId}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                Official Uniform Cut & Style Guide
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">{proj.school_name}</h2>
              <p className="text-xs text-amber-200/80">
                Single master design for all students. Adjust only by individual measurements below.
              </p>
            </div>

            {proj.uniform_sample_image_url ? (
              <a
                href={proj.uniform_sample_image_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 hover:border-amber-400 transition group"
              >
                <img
                  src={proj.uniform_sample_image_url}
                  alt={`${proj.school_name} Sample`}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                />
                <span className="text-[10px] font-bold text-amber-300 group-hover:underline pr-2 hidden sm:inline">
                  Enlarge Style Reference ↗
                </span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">No sample image uploaded</span>
            )}
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'PENDING' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Pending Production ({pending.length})
        </button>
        <button
          onClick={() => setFilter('DONE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'DONE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Completed ({done.length})
        </button>
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          All Assigned ({students.length})
        </button>
      </div>

      {/* Student Measurement Work Cards (Pure Physical Measurements) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayed.map((st) => (
          <div
            key={st.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">{st.student_name}</h3>
                  <span className="text-xs text-amber-400 font-bold">{st.sets_count} Set(s) Required</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    st.status === 'DONE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : st.status === 'RETURNED'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {st.status === 'RETURNED' ? 'NEEDS CORRECTION' : st.status}
                </span>
              </div>

              {st.return_reason && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <span className="font-bold block">⚠️ Adjustment Note:</span>
                  {st.return_reason}
                </div>
              )}

              {/* The 4 Measurements */}
              <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-sans text-slate-400 font-bold block">Kafada</span>
                  <span className="text-sm font-black text-white">{st.kafada}&quot;</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-sans text-slate-400 font-bold block">Hannu</span>
                  <span className="text-sm font-black text-white">{st.hannu}&quot;</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-sans text-slate-400 font-bold block">Riga</span>
                  <span className="text-sm font-black text-white">{st.riga}&quot;</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-sans text-slate-400 font-bold block">Wando</span>
                  <span className="text-sm font-black text-white">{st.wando}&quot;</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2 border-t border-slate-800">
              {st.status !== 'DONE' ? (
                <button
                  type="button"
                  disabled={updatingId === st.id}
                  onClick={() => handleComplete(st.id, st.project_id)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition disabled:opacity-50 shadow-md"
                >
                  {updatingId === st.id ? 'Saving...' : '✓ Complete Uniform'}
                </button>
              ) : (
                <div className="text-center text-xs text-emerald-400 font-bold py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  ✓ Marked Completed
                </div>
              )}
            </div>
          </div>
        ))}

        {displayed.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
            No uniforms matching this tab currently assigned to your branch.
          </div>
        )}
      </div>

    </div>
  );
}
