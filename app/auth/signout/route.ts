import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('SignOut error:', err);
  }

  const url = new URL(request.url);
  const nextTarget = url.searchParams.get('next') || '/login';
  const response = NextResponse.redirect(new URL(nextTarget, request.url));

  // Clear every supabase and session cookie
  const allCookies = cookieStore.getAll();
  allCookies.forEach((c) => {
    if (c.name.startsWith('sb-') || c.name.includes('auth') || c.name.includes('token') || c.name.includes('supabase')) {
      response.cookies.delete(c.name);
      cookieStore.delete(c.name);
    }
  });

  return response;
}

export async function POST(request: NextRequest) {
  return GET(request);
}
