'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Runs an async action at most once at a time. While one run is in flight, further calls are
 * ignored and `pending` is true (use it to disable the button).
 *
 * The in-flight flag is a ref, not state, so a rapid double-click is blocked immediately
 * instead of waiting for React to re-render the disabled button.
 */
export function useSingleFlight() {
	const inFlight = useRef(false)
	const [pending, setPending] = useState(false)

	const run = useCallback(async (action: () => Promise<void>): Promise<void> => {
		if (inFlight.current) return
		inFlight.current = true
		setPending(true)
		try {
			await action()
		} finally {
			inFlight.current = false
			setPending(false)
		}
	}, [])

	return { pending, run }
}
