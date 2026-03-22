'use client'

import { useState } from 'react'
import { Button } from '@heroui/button'
import { Input, Textarea } from '@heroui/react'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgonjape'

export default function IssuePage() {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [message, setMessage] = useState('')
	const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
		'idle',
	)
	const [errorMessage, setErrorMessage] = useState('')

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!name.trim() || !email.trim() || !message.trim()) {
			alert('Please fill in name, email, and message.')
			return
		}
		const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
		if (!emailOk) {
			alert('Please enter a valid email address.')
			return
		}

		setStatus('submitting')
		setErrorMessage('')

		try {
			const response = await fetch(FORMSPREE_ENDPOINT, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					message: message.trim(),
				}),
			})

			const data = (await response.json().catch(() => ({}))) as {
				error?: string
				errors?: Record<string, string> | { message?: string }[]
			}

			if (!response.ok) {
				let fromErrors = ''
				if (data.errors && !Array.isArray(data.errors)) {
					fromErrors = Object.values(data.errors).filter(Boolean).join(' ')
				} else if (Array.isArray(data.errors)) {
					fromErrors = data.errors
						.map((err) => ('message' in err ? err.message : ''))
						.filter(Boolean)
						.join(' ')
				}
				const msg =
					(data.error ?? fromErrors) ||
					'Something went wrong. Please try again.'
				setErrorMessage(msg)
				setStatus('error')
				return
			}

			setStatus('success')
		} catch {
			setErrorMessage('Network error. Please try again.')
			setStatus('error')
		}
	}

	return (
		<div className="flex min-h-[calc(80vh-var(--nav-height,4rem))] flex-col items-center justify-start px-6 pt-16 pb-12">
			<div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold">Report an issue</h1>
					<p className="text-white/80 text-sm">
						Tell us what went wrong and we&apos;ll look into it.
					</p>
				</div>

				{status === 'success' ? (
					<div className="w-full rounded-lg border border-white/20 bg-white/5 px-5 py-8 text-center">
						<p className="text-lg font-semibold">Thanks — we got your message.</p>
						<p className="mt-2 text-sm text-white/80">
							We&apos;ll follow up by email if needed.
						</p>
					</div>
				) : (
					<form
						className="flex w-full flex-col gap-5 text-left"
						onSubmit={handleSubmit}
					>
						<div className="flex flex-col gap-2">
							<p className="text-xl font-bold">Name</p>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								size="md"
								type="text"
								autoComplete="name"
								isRequired
								isDisabled={status === 'submitting'}
								aria-label="Your name"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-xl font-bold">Email</p>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								size="md"
								type="email"
								autoComplete="email"
								isRequired
								isDisabled={status === 'submitting'}
								aria-label="Your email"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-xl font-bold">Message</p>
							<Textarea
								minRows={5}
								maxRows={12}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								size="md"
								isRequired
								isDisabled={status === 'submitting'}
								aria-label="Describe the issue"
							/>
						</div>

						{errorMessage ? (
							<p className="text-sm text-red-400" role="alert">
								{errorMessage}
							</p>
						) : null}

						<Button
							type="submit"
							color="primary"
							className="mt-1 w-full"
							isLoading={status === 'submitting'}
							isDisabled={status === 'submitting'}
						>
							Send report
						</Button>
					</form>
				)}
			</div>
		</div>
	)
}
