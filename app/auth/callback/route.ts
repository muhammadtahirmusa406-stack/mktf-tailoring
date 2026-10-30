import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/partner/apply';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Ensure the profile row exists upon email confirmation
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || 'New Tailor Partner',
        role: 'customer',
        is_active: true,
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback if code verification fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
