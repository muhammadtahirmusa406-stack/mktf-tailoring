'use server';

import { createClient } from '@/utils/supabase-server';
import { redirect } from 'next/navigation';

export async function loginStaffAction(formData: FormData): Promise<{ success: boolean; role?: string; error?: string }> {
  try {
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = (formData.get('password') as string)?.trim();

    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      return { success: false, error: authError?.message || 'Invalid login credentials.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    const roleRaw = (profile?.role || '').toLowerCase();
    const role = (roleRaw === 'admin' || roleRaw === 'master_admin') ? 'MASTER_ADMIN' : 'STAFF';

    return { success: true, role };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login failed.' };
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/staff/login');
}

export async function logoutStaffAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/staff/login');
}
export async function registerChildShopAction(formData: FormData) {
  try {
    const branchName = (formData.get('branchName') as string)?.trim();
    const fullName = (formData.get('fullName') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = (formData.get('password') as string)?.trim();
    const secretCode = (formData.get('secretCode') as string)?.trim();

    if (!branchName || !fullName || !email || !password || !secretCode) {
      return { success: false, error: 'All fields are required.' };
    }

    if (secretCode !== '@MKTF2026') {
      return { success: false, error: 'Invalid MKTF Master Access Key. Contact Master HQ.' };
    }

    const supabase = await createClient();

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          branch_name: branchName,
          role: 'tailor',
        },
      },
    });

    if (authError || !authData?.user) {
      return { success: false, error: authError?.message || 'Failed to create branch account.' };
    }

    // 2. Insert or update profile record with role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'tailor',
        shop_name: branchName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('Profile sync warning:', profileError.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Registration action error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
