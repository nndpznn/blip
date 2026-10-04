'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Returns a function that sends a logged-out visitor to the sign-in page and brings
 * them back to the page they were on afterwards (same flow the route gate in
 * middleware.ts uses: /loginrequired?next=<path>).
 */
export function useLoginPrompt() {
	const router = useRouter()
	const pathname = usePathname()

	return useCallback(() => {
		router.push(`/loginrequired?next=${encodeURIComponent(pathname || '/map')}`)
	}, [router, pathname])
}
