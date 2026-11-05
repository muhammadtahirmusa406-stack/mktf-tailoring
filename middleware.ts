import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;
            delete sessionOptions.expires;
            supabaseResponse.cookies.set(name, value, sessionOptions);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isStaffRoute =
    path.startsWith('/shop') ||
    path.startsWith('/staff/branch-floor') ||
    path.startsWith('/staff/school-projects');

  const isAdminRoute = path.startsWith('/admin');

  // 1. Unauthenticated gatekeeping
  if (!user) {
    if (isAdminRoute) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }
    if (isStaffRoute) {
      const redirectUrl = new URL('/staff/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // 2. Authenticated: Fetch user role from profiles to enforce role boundaries
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'master_admin';

  // Prevent artisans / branch accounts from accessing admin endpoints
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL('/shop/dashboard', request.url));
  }

  // 3. Prevent logged-in users from viewing login pages again
  if (path === '/staff/login' || path === '/login') {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin/orders', request.url));
    } else {
      return NextResponse.redirect(new URL('/shop/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
