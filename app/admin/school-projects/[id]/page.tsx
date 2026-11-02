import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase-server';
import SchoolWorkspaceClient from './school-workspace-client';

export const dynamic = 'force-dynamic';

export default async function SchoolProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [projectRes, studentsRes, shopsRes] = await Promise.all([
    supabase.from('school_projects').select('*').eq('id', id).single(),
    supabase.from('school_students').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('child_shops').select('id, name, location').order('name', { ascending: true }),
  ]);

  if (!projectRes.data) notFound();

  const students = studentsRes.data || [];
  const shops = shopsRes.data || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/school-projects" className="text-xs text-amber-400 hover:underline">
            ← Back to School Projects List
          </Link>
        </div>

        <SchoolWorkspaceClient
          project={projectRes.data}
          initialStudents={students as any}
          availableShops={shops}
        />
      </div>
    </div>
  );
}
