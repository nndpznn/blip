"use client";

import Link from "next/link";
import { Button } from "@heroui/button";
import MeetImageGallery from "@/components/MeetImageGallery";
import { CalendarIcon } from "@/assets/CalendarIcon";
import { MapPinIcon } from "@/assets/MapPinIcon";

/** Static mock for layout testing only — not loaded from Supabase. */
const MOCK_MEET = {
	title: "Sunset sketch walk — Marina Green",
	body: `We're meeting at Marina Green for a relaxed evening of sketching the skyline and people-watching.

Bring your own supplies; beginners welcome. We'll wrap up before dark and optionally grab food nearby.

This copy is fake data to preview how a long body reads under the blog-style meet layout.`,
	dateLabel: "Sat, Mar 28, 2026",
	timeLabel: "5:30pm – 7:30pm",
	locationLine: "Marina Green, San Francisco, CA",
	mapsUrl: "https://maps.google.com/?q=Marina+Green+San+Francisco",
	organizerName: "alexdraws",
	organizerColor: "#c45c26",
	attendeeCount: 12,
	/** Distinct seeds so picsum returns different images. */
	images: [
		"https://picsum.photos/seed/blipmeet1/1200/800",
		"https://picsum.photos/seed/blipmeet2/1200/800",
		"https://picsum.photos/seed/blipmeet3/1200/800",
	],
} as const;

/**
 * Experimental meet detail: title → gallery → body → meta → actions (scroll down).
 * Does not replace /meet/[id].
 */
export default function MeetBlogLayoutSandbox() {
	return (
		<div className="w-full min-h-0">
			<article className="mx-auto max-w-3xl px-4 pb-16 pt-8">
				<p className="mb-6 text-center">
					<Link
						href="/sandbox"
						className="text-sm text-foreground/60 underline underline-offset-2 hover:text-foreground"
					>
						← Sandbox
					</Link>
				</p>

				{/* 1. Title */}
				<header className="mb-8 text-center">
					<h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
						{MOCK_MEET.title}
					</h1>
				</header>

				{/* 2. Gallery */}
				<section
					className="mb-12 w-full overflow-hidden rounded-xl border border-red-400/40 bg-white/5 px-3 py-4 sm:px-6"
					aria-label="Meet photos"
				>
					<MeetImageGallery
						images={[...MOCK_MEET.images]}
						title={MOCK_MEET.title}
					/>
				</section>

				{/* 3. Body */}
				<section className="mb-10">
					<div className="mx-auto max-w-2xl text-center text-base leading-relaxed text-foreground/90">
						{MOCK_MEET.body.split("\n\n").map((para, i) => (
							<p key={i} className="mb-4 last:mb-0">
								{para}
							</p>
						))}
					</div>
				</section>

				{/* 4. When & where */}
				<section className="mb-10 rounded-xl border border-white/10 bg-white/5 px-4 py-4">
					<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base text-foreground/90">
						<CalendarIcon className="size-4 shrink-0 text-red-400/80" />
						<span className="font-medium">{MOCK_MEET.dateLabel}</span>
						<span className="text-white/50" aria-hidden>
							·
						</span>
						<span>{MOCK_MEET.timeLabel}</span>
					</div>
					<div className="mt-3 flex items-start justify-center gap-2 text-sm text-foreground/80">
						<MapPinIcon className="mt-0.5 size-4 shrink-0 text-red-400/80" />
						<button
							type="button"
							className="text-left underline-offset-2 hover:underline"
							onClick={() => window.open(MOCK_MEET.mapsUrl, "_blank", "noopener,noreferrer")}
						>
							{MOCK_MEET.locationLine}
						</button>
					</div>
				</section>

				{/* 5. Organizer + RSVP (mock — no backend) */}
				<footer className="flex flex-col items-stretch gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
						<span className="text-sm text-foreground/80">Organized by</span>
						<Button
							size="sm"
							className="text-white"
							style={{ backgroundColor: MOCK_MEET.organizerColor }}
						>
							{MOCK_MEET.organizerName}
						</Button>
					</div>
					<div className="flex items-center justify-center gap-3 sm:justify-end">
						<Button
							size="sm"
							className="bg-gray-500 text-white hover:bg-gray-600"
							isDisabled
							title="Mock only — not connected to RSVP"
						>
							Attend
						</Button>
						<span className="text-sm font-semibold text-foreground/90">
							{MOCK_MEET.attendeeCount} going
						</span>
					</div>
				</footer>
			</article>
		</div>
	);
}
