import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase-server';
import BranchProjectsClient from './branch-projects-client';

export const dynamic = 'force-dynamic';

export default async function BranchSchoolProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/staff/login?next=/staff/school-projects');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role?.toLowerCase() || '';
  const isAdmin = role === 'admin' || role === 'master_admin';

  const { data: allShops = [] } = await supabase
    .from('child_shops')
    .select('*')
    .order('name', { ascending: true });

  let activeShop: any = null;

  if (isAdmin) {
    activeShop = resolvedParams.shopId
      ? allShops?.find((s: any) => s.id === resolvedParams.shopId) || allShops?.[0]
      : allShops?.[0];
  } else {
    activeShop = (allShops || []).find((s: any) => s.id === profile?.child_shop_id) || allShops?.[0];
  }

  if (!activeShop) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-sm text-slate-400">No active workshop branch assigned to this account.</p>
      </div>
    );
  }

  const { data: students = [] } = await supabase
    .from('school_students')
    .select('*, school_projects!inner(school_name, uniform_sample_image_url)')
    .eq('assigned_child_shop_id', activeShop.id)
    .order('created_at', { ascending: false });

  const formattedStudents = (students || []).map((s: any) => ({
    id: s.id,
    project_id: s.project_id,
    student_name: s.student_name,
    sets_count: s.sets_count,
    kafada: s.kafada,
    hannu: s.hannu,
    riga: s.riga,
    wando: s.wando,
    status: s.status,
    return_reason: s.return_reason,
    school_name: s.school_projects?.school_name || 'School Project',
    uniform_sample_image_url: s.school_projects?.uniform_sample_image_url || null,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <BranchProjectsClient shop={activeShop} initialStudents={formattedStudents} />
      </div>
    </div>
  );
}
