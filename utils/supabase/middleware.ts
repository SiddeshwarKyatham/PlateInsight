import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isStaffRoute = pathname === '/staff' || pathname.startsWith('/staff/')
  const isNgoRoute = pathname === '/ngo' || pathname.startsWith('/ngo/')
  const isRecyclerRoute = pathname === '/recycler' || pathname.startsWith('/recycler/')
  const needsUsersProfile =
    isAdminRoute ||
    isStaffRoute ||
    pathname === '/signup' ||
    pathname === '/create-ecosystem'
  const needsNgoProfile = isNgoRoute
  const needsRecyclerProfile = isRecyclerRoute

  let profile: { role: string; verified?: boolean | null } | null = null
  let ngoProfile: { id: string } | null = null
  let recyclerProfile: { id: string } | null = null
  if (user) {
    if (needsUsersProfile) {
      try {
        const { data } = await supabase
          .from('users')
          .select('role, verified')
          .eq('id', user.id)
          .maybeSingle()
        profile = data
      } catch {
        profile = null
      }
    }

    if (needsNgoProfile) {
      try {
        const { data: ngoData } = await supabase
          .from('ngos')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        ngoProfile = ngoData
      } catch {
        ngoProfile = null
      }
    }

    if (needsRecyclerProfile) {
      try {
        const { data: recyclerData } = await supabase
          .from('recyclers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        recyclerProfile = recyclerData
      } catch {
        recyclerProfile = null
      }
    }
  }

  const redirectTo = (target: string) => {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url)
  }

  // Canonical parent-route redirects
  if (pathname === '/admin') {
    if (!user) return redirectTo('/admin/login')
    if (profile?.role === 'admin') return redirectTo('/admin/dashboard')
    if (profile?.role === 'staff') return redirectTo(profile.verified ? '/staff/dashboard' : '/staff/pending')
    return redirectTo('/')
  }

  if (pathname === '/staff') {
    if (!user) return redirectTo('/staff/login')
    if (profile?.role === 'staff') return redirectTo(profile.verified ? '/staff/dashboard' : '/staff/pending')
    if (profile?.role === 'admin') return redirectTo('/admin/dashboard')
    return redirectTo('/')
  }

  if (pathname === '/ngo') {
    if (!user) return redirectTo('/ngo/login')
    if (ngoProfile) return redirectTo('/ngo/dashboard')
    return redirectTo('/ngo/login')
  }

  if (pathname === '/recycler') {
    if (!user) return redirectTo('/recycler/login')
    if (recyclerProfile) return redirectTo('/recycler/dashboard')
    return redirectTo('/recycler/login')
  }

  // --- 1. Prevent logged-in users from getting stuck on login screens ---
  if (user) {
    if (pathname === '/admin/login' || pathname === '/signup') {
      if (profile?.role === 'admin') {
        return redirectTo('/admin/dashboard')
      }
    }
    
    if (pathname === '/staff/login') {
      if (profile?.role === 'staff') {
        return redirectTo(profile.verified ? '/staff/dashboard' : '/staff/pending')
      } else if (profile?.role === 'admin') {
        return redirectTo('/admin/dashboard')
      }
    }

    if (pathname === '/ngo/login' || pathname === '/ngo/signup') {
      if (ngoProfile) return redirectTo('/ngo/dashboard')
    }

    if (pathname === '/recycler/login' || pathname === '/recycler/signup') {
      if (recyclerProfile) return redirectTo('/recycler/dashboard')
    }
  }

  // --- 2. Protect Admin Routes ---
  if (isAdminRoute && pathname !== '/admin/login') {
    if (!user) {
      return redirectTo('/admin/login')
    }
    
    // If they aren't an admin, kick them OUT of admin routes
    if (!profile || profile.role !== 'admin') {
      if (profile?.role === 'staff') {
        return redirectTo(profile.verified ? '/staff/dashboard' : '/staff/pending')
      }
      return redirectTo('/')
    }
  }

  // --- 3. Protect Staff Routes ---
  if (isStaffRoute && pathname !== '/staff/login' && pathname !== '/staff/pending') {
    if (!user) {
      return redirectTo('/staff/login')
    }

    // Pending staff check
    if (!profile || profile.role !== 'staff') {
      if (profile?.role === 'admin') return redirectTo('/admin/dashboard')
      return redirectTo('/')
    }
    if (!profile.verified) {
      return redirectTo('/staff/pending')
    }
  }

  // Allow pending page only for pending staff
  if (pathname === '/staff/pending') {
    if (!user) return redirectTo('/staff/login')
    if (!profile || profile.role !== 'staff') {
      if (profile?.role === 'admin') return redirectTo('/admin/dashboard')
      return redirectTo('/')
    }
    if (profile.verified) return redirectTo('/staff/dashboard')
  }

  if (isNgoRoute && pathname !== '/ngo/login' && pathname !== '/ngo/signup') {
    if (!user) return redirectTo('/ngo/login')
    if (!ngoProfile) {
      return redirectTo('/ngo/login')
    }
  }

  if (isRecyclerRoute && pathname !== '/recycler/login' && pathname !== '/recycler/signup') {
    if (!user) return redirectTo('/recycler/login')
    if (!recyclerProfile) {
      return redirectTo('/recycler/login')
    }
  }

  return supabaseResponse
}
