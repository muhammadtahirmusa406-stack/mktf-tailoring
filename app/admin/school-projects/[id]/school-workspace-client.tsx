'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  addSchoolStudentAction,
  assignStudentsBranchAction,
  markStudentDoneAction,
  flagStudentReturnAction,
  resolveStudentReturnAction,
} from '../actions';

interface Student {
  id: string;
  student_name: string;
  sets_count: number;
  kafada: number;
  hannu: number;
  riga: number;
  wando: number;
  assigned_child_shop_id: string | null;
  status: 'PENDING' | 'DONE' | 'RETURNED';
  return_reason: string | null;
  created_at: string;
}

export default function SchoolWorkspaceClient({
  project,
  initialStudents,
  availableShops,
}: {
  project: any;
  initialStudents: Student[];
  availableShops: any[];
}) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'DONE' | 'RETURNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetShopId, setTargetShopId] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Fast Intake State
  const [studentName, setStudentName] = useState('');
  const [setsCount, setSetsCount] = useState(2);
  const [kafada, setKafada] = useState('');
  const [hannu, setHannu] = useState('');
  const [riga, setRiga] = useState('');
  const [wando, setWando] = useState('');
  const [intakeLoading, setIntakeLoading] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleFastIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !kafada || !hannu || !riga || !wando) {
      alert('Please fill student name and all 4 measurements (Kafada, Hannu, Riga, Wando).');
      return;
    }

    setIntakeLoading(true);
    try {
      const res = await addSchoolStudentAction({
        projectId: project.id,
        studentName: studentName.trim(),
        setsCount,
        kafada: Number(kafada),
        hannu: Number(hannu),
        riga: Number(riga),
        wando: Number(wando),
      });

      if (res.success) {
        // Optimistically add to state
        setStudents((prev) => [
          {
            id: Math.random().toString(),
            student_name: studentName.trim(),
            sets_count: setsCount,
            kafada: Number(kafada),
            hannu: Number(hannu),
            riga: Number(riga),
            wando: Number(wando),
            assigned_child_shop_id: null,
            status: 'PENDING',
            return_reason: null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);

        // Reset measurement fields and refocus name
        setStudentName('');
        setKafada('');
        setHannu('');
        setRiga('');
        setWando('');
        nameInputRef.current?.focus();
      } else {
        alert(res.error || 'Failed to add student.');
      }
    } finally {
      setIntakeLoading(false);
    }
  };

  const handleMarkDone = async (studentId: string) => {
    setLoadingAction(true);
    try {
      const res = await markStudentDoneAction(studentId, project.id);
      if (res.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, status: 'DONE', return_reason: null } : s))
        );
      } else {
        alert(res.error || 'Error marking done');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleFlagReturn = async (studentId: string) => {
    const reason = window.prompt('Specify alteration / replacement needed (e.g. Wando length +1 inch):');
    if (!reason || !reason.trim()) return;

    setLoadingAction(true);
    try {
      const res = await flagStudentReturnAction(studentId, project.id, reason.trim());
      if (res.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, status: 'RETURNED', return_reason: reason.trim() } : s))
        );
      } else {
        alert(res.error || 'Error flagging return');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResolveReturn = async (studentId: string) => {
    if (!window.confirm('Mark this alteration resolved and re-done? (This will log a secondary resolved entry into the manifest)')) return;

    setLoadingAction(true);
    try {
      const res = await resolveStudentReturnAction(studentId, project.id);
      if (res.success) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, status: 'DONE', return_reason: null } : s))
        );
      } else {
        alert(res.error || 'Error resolving return');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  const handleSingleAssign = async (studentId: string, shopId: string) => {
    setUpdatingStudentId(studentId);
    try {
      const cleanShopId = shopId === "" ? null : shopId;
      const res = await assignStudentsBranchAction({
        projectId: project.id,
        studentIds: [studentId],
        shopId: cleanShopId,
      });

      if (res.success) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId ? { ...s, assigned_child_shop_id: cleanShopId } : s
          )
        );
      } else {
        alert(res.error || 'Failed to update branch assignment');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error updating branch');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleBatchAssign = async () => {
    if (!selectedIds.length) return;
    setLoadingAction(true);
    try {
      const res = await assignStudentsBranchAction({
        projectId: project.id,
        studentIds: selectedIds,
        shopId: targetShopId || null,
      });

      if (res.success) {
        setStudents((prev) =>
          prev.map((s) =>
            selectedIds.includes(s.id) ? { ...s, assigned_child_shop_id: targetShopId || null } : s
          )
        );
        setSelectedIds([]);
      } else {
        alert(res.error || 'Failed to assign branch');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const pendingList = students.filter((s) => s.status === 'PENDING');
  const doneList = students.filter((s) => s.status === 'DONE');
  const returnedList = students.filter((s) => s.status === 'RETURNED');

  const filteredStudents = (
    activeTab === 'ALL'
      ? students
      : activeTab === 'PENDING'
      ? pendingList
      : activeTab === 'DONE'
      ? doneList
      : returnedList
  ).filter((s) => s.student_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      
      {/* Project Header Bar */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase">
              Project Contract
            </span>
            {project.contact_phone && (
              <span className="text-xs text-slate-400 font-mono">📞 {project.contact_phone}</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white">{project.school_name}</h1>
          <p className="text-xs text-slate-400">
            Total Students: <strong className="text-white">{students.length}</strong> • Total Sets:{' '}
            <strong className="text-amber-400">
              {students.reduce((acc, curr) => acc + (curr.sets_count || 2), 0)} Sets
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {project.uniform_sample_image_url && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <img
                src={project.uniform_sample_image_url}
                alt="Uniform Sample"
                className="w-14 h-14 object-cover rounded-lg border border-slate-700"
              />
              <div className="text-left pr-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Style Reference</span>
                <a
                  href={project.uniform_sample_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  View Large ↗
                </a>
              </div>
            </div>
          )}

          <Link
            href={`/admin/school-projects/${project.id}/print`}
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-md transition"
          >
            🖨️ Delivery Manifest
          </Link>
        </div>
      </div>

      {/* FAST FIELD INTAKE BAR (Rapid Keyboard Entry) */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span>⚡</span> Quick On-Site Student Intake (Name + 4 Measurements)
          </h2>
          <span className="text-[10px] text-amber-200/80 font-mono">Press Tab to advance • Press Enter to save</span>
        </div>

        <form onSubmit={handleFastIntakeSubmit} className="grid grid-cols-2 sm:grid-cols-7 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">Student Name *</label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Ibrahim Bello"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">Sets</label>
            <select
              value={setsCount}
              onChange={(e) => setSetsCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white focus:outline-none"
            >
              <option value={1}>1 Set</option>
              <option value={2}>2 Sets</option>
              <option value={3}>3 Sets</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">Kafada (in)</label>
            <input
              type="number"
              step="0.5"
              required
              value={kafada}
              onChange={(e) => setKafada(e.target.value)}
              placeholder="15"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">Hannu (in)</label>
            <input
              type="number"
              step="0.5"
              required
              value={hannu}
              onChange={(e) => setHannu(e.target.value)}
              placeholder="21"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">Riga (in)</label>
            <input
              type="number"
              step="0.5"
              required
              value={riga}
              onChange={(e) => setRiga(e.target.value)}
              placeholder="32"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">Wando (in)</label>
            <input
              type="number"
              step="0.5"
              required
              value={wando}
              onChange={(e) => setWando(e.target.value)}
              placeholder="38"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="col-span-2 sm:col-span-7 flex justify-end">
            <button
              type="submit"
              disabled={intakeLoading}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition disabled:opacity-50"
            >
              {intakeLoading ? 'Adding...' : '+ Save Student (Enter)'}
            </button>
          </div>
        </form>
      </div>

      {/* BATCH DELEGATION TOOLBAR */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-indigo-200">
            {selectedIds.length} Student(s) Selected
          </span>

          <div className="flex items-center gap-2">
            <select
              value={targetShopId}
              onChange={(e) => setTargetShopId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-400/50 text-xs text-white focus:outline-none"
            >
              <option value="">-- Central Queue (Unassigned) --</option>
              {availableShops.map((shop: any) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} ({shop.location || 'Branch'})
                </option>
              ))}
            </select>

            <button
              onClick={handleBatchAssign}
              disabled={loadingAction}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition"
            >
              Assign Selected →
            </button>
          </div>
        </div>
      )}

      {/* 4 OPERATIONAL TABS & SEARCH */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Students ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'PENDING' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingList.length})
            </button>
            <button
              onClick={() => setActiveTab('DONE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'DONE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Done ({doneList.length})
            </button>
            <button
              onClick={() => setActiveTab('RETURNED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'RETURNED' ? 'bg-rose-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Returned / Fix ({returnedList.length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search student by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* ROSTER TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filteredStudents.map((s) => s.id) : [])
                    }
                  />
                </th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Sets</th>
                <th className="p-3">Kafada</th>
                <th className="p-3">Hannu</th>
                <th className="p-3">Riga</th>
                <th className="p-3">Wando</th>
                <th className="p-3">Assigned Branch</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStudents.map((st) => {
                const assignedShop = availableShops.find((s: any) => s.id === st.assigned_child_shop_id);

                return (
                  <tr key={st.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(st.id)}
                        onChange={() => toggleSelectStudent(st.id)}
                      />
                    </td>
                    <td className="p-3 font-sans font-bold text-white">
                      {st.student_name}
                      {st.return_reason && (
                        <span className="block font-sans text-[11px] text-rose-300 mt-0.5">
                          ⚠️ Fix: {st.return_reason}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-amber-400 font-bold">{st.sets_count} Set(s)</td>
                    <td className="p-3">{st.kafada}&quot;</td>
                    <td className="p-3">{st.hannu}&quot;</td>
                    <td className="p-3">{st.riga}&quot;</td>
                    <td className="p-3">{st.wando}&quot;</td>
                    <td className="p-3 font-sans">
                        <select
                          disabled={updatingStudentId === st.id}
                          value={st.assigned_child_shop_id || ""}
                          onChange={(e) => handleSingleAssign(st.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">🏢 Central Atelier (Unassigned)</option>
                          {availableShops.map((shop: any) => (
                            <option key={shop.id} value={shop.id}>
                              📍 {shop.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    <td className="p-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.status === 'DONE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : st.status === 'RETURNED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {st.status === 'PENDING' && (
                          <button
                            disabled={loadingAction}
                            onClick={() => handleMarkDone(st.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                          >
                            ✓ Mark Done
                          </button>
                        )}

                        {st.status === 'DONE' && (
                          <button
                            disabled={loadingAction}
                            onClick={() => handleFlagReturn(st.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-[11px] transition"
                          >
                            ⚠️ Return for Fix
                          </button>
                        )}

                        {st.status === 'RETURNED' && (
                          <button
                            disabled={loadingAction}
                            onClick={() => handleResolveReturn(st.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                          >
                            ✓ Alteration Resolved
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 text-xs font-sans">
                    No students found in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
