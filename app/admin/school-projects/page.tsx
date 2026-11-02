import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';
import CreateProjectClient from './create-project-client';

export const dynamic = 'force-dynamic';

export default async function SchoolProjectsPage() {
  const supabase = await createClient();

  const [projectsRes, studentsRes] = await Promise.all([
    supabase.from('school_projects').select('*').order('created_at', { ascending: false }),
    supabase.from('school_students').select('project_id, status, sets_count'),
  ]);

  const projects = projectsRes.data || [];
  const students = studentsRes.data || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-xs text-amber-400 hover:underline">
                ← Supervisory Hub
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2">
              <span>🏫</span> School Uniform Projects
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Institutional bulk cutting, student rosters, branch distribution, and production manifests.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition"
            >
              📦 Bespoke Orders
            </Link>
          </div>
        </div>

        {/* Client-Side Intake Drawer with Validation & Loading */}
        <CreateProjectClient />

        {/* Existing Projects Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active School Portfolios ({projects.length})
          </h3>

          {projects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
              <p className="text-sm text-slate-500">
                No school uniform projects active yet. Fill the intake above to launch your first contract.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => {
                const projectStudents = students.filter((s) => s.project_id === proj.id);
                const totalStudents = projectStudents.length;
                const completedCount = projectStudents.filter((s) => s.status === 'DONE').length;
                const progressPct = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

                return (
                  <Link
                    key={proj.id}
                    href={`/admin/school-projects/${proj.id}`}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition group flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-black text-white group-hover:text-amber-400 transition">
                          {proj.school_name}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {proj.status}
                        </span>
                      </div>
                      {proj.contact_phone && (
                        <p className="text-xs text-slate-400 mt-1">📞 {proj.contact_phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">{completedCount} / {totalStudents} Completed</span>
                        <span className="font-bold text-amber-400">{progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
