'use server';

import { createClient } from '@/utils/supabase-server';
import { redirect } from 'next/navigation';

export async function loginStaffAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string)?.trim();

  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData?.user) {
    console.error('Supabase Login Error:', authError);
    throw new Error(authError?.message || 'Invalid login credentials.');
  }

  // Fetch role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
  }

  const role = profile?.role?.toLowerCase();

  if (role === 'admin' || role === 'master_admin') {
    redirect('/admin/catalog');
  } else {
    redirect('/staff/branch-floor');
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