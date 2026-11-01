import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Enforce active authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  // 2. Enforce strict Master Admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role || '').toLowerCase();
  const isMasterAdmin = role === 'admin' || role === 'master_admin';

  if (!isMasterAdmin) {
    // If an artisan tries to access admin routes, route them to their floor
    if (role === 'child_shop') {
      redirect('/staff/branch-floor');
    }
    // Any other unauthorized role
    redirect('/order/new');
  }

  return <>{children}</>;
}
