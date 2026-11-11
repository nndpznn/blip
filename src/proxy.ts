import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/clients/supabase/session'

const SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	// Browsers ignore HSTS over plain http (e.g. localhost), so this is safe to send everywhere.
	// No includeSubDomains/preload on purpose: widen only once every subdomain is known to be https.
	'Strict-Transport-Security': 'max-age=31536000',
	// Report-only first: violations show in the browser console without breaking anything.
	// Promote to `Content-Security-Policy` once /map, /meets, /create, /profile and meet pages are clean.
	// 'unsafe-inline' for scripts/styles is needed by Next.js/HeroUI until nonces are wired up.
	'Content-Security-Policy-Report-Only': buildCsp(),
}

function buildCsp(): string {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
	const supabaseWs = supabaseUrl.replace(/^http/, 'ws')
	const directives = [
		"default-src 'self'",
		// 'unsafe-eval' only outside production (React dev tooling needs it).
		`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
		"style-src 'self' 'unsafe-inline'",
		// Meet photos come from Supabase Storage; the map draws tiles/sprites onto canvas and blobs.
		`img-src 'self' data: blob: ${supabaseUrl} https://tiles.openfreemap.org`,
		"font-src 'self' data: https://tiles.openfreemap.org",
		// Supabase REST/auth/realtime, map style + tiles + glyphs, Photon geocoder, Formspree issue form.
		`connect-src 'self' ${supabaseUrl} ${supabaseWs} https://tiles.openfreemap.org https://photon.komoot.io https://formspree.io`,
		"worker-src 'self' blob:",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'",
	]
	return directives.join('; ')
}

const PROTECTED_PATHS = ['/create', '/profile', '/user']

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

export async function proxy(request: NextRequest) {
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
