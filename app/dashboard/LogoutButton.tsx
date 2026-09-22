'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      return;
    }

    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading}>
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  );
}