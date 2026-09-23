import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/clients/supabase/middleware'

const SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const PROTECTED_PATHS = ['/create', '/profile']

function applySecurityHeaders(response: NextResponse) {
	Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
		response.headers.set(key, value)
	})
	return response
}

function copyCookies(from: NextResponse, to: NextResponse) {
	from.cookies.getAll().forEach((cookie) => {
		to.cookies.set(cookie)
	})
	return to
}

export async function middleware(request: NextRequest) {
	const { user, supabaseResponse } = await updateSession(request)
	const pathname = request.nextUrl.pathname

	if (
		process.env.NODE_ENV === 'production' &&
		pathname.startsWith('/sandbox')
	) {
		const response = new NextResponse(null, { status: 404 })
		copyCookies(supabaseResponse, response)
		return applySecurityHeaders(response)
	}

	const isProtected = PROTECTED_PATHS.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`)
	)

	if (isProtected && !user) {
		const loginUrl = request.nextUrl.clone()
		loginUrl.pathname = '/loginrequired'
		loginUrl.searchParams.set('next', pathname)
		const response = NextResponse.redirect(loginUrl)
		copyCookies(supabaseResponse, response)
		return applySecurityHeaders(response)
	}

	return applySecurityHeaders(supabaseResponse)
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
}
