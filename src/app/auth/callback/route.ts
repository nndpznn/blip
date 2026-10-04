import { NextResponse } from 'next/server'
import { createClient } from '@/clients/supabase/server'
import { safeNextPath } from '@/util/safeNextPath'

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const next = safeNextPath(searchParams.get('next'))

	if (code) {
		const supabase = await createClient()
		const { error } = await supabase.auth.exchangeCodeForSession(code)
		if (!error) {
			return NextResponse.redirect(`${origin}${next}`)
		}
		console.error('Auth callback exchange failed:', error.message)
	}

	return NextResponse.redirect(`${origin}/loginrequired?next=${encodeURIComponent(next)}`)
}
