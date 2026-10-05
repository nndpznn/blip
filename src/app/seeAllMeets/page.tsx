'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import Meet from "@/models/meet";
import MeetCard from "@/components/meetCard"
import { supabase } from "@/clients/supabaseClient";
import { useAuth } from "@/clients/authContext";
import { fetchAttendeeSummary, fetchMeetPage } from "@/api/meets";
import {
	initialCursor,
	nextCursor,
	type MeetCursor,
	type MeetSort,
} from "@/util/meetPaging";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Checkbox, Spinner } from "@heroui/react";

/** Maps meet id -> attendee count. Keys are String(meet.id) for UUID-safe lookup. */
type AttendeeCountMap = Record<string, number>;
/** Set of meet ids the current user is attending. */
type AttendingSet = Set<string>;
/** Maps organizer profile id -> display name. */
type OrganizerNameMap = Record<string, string>;

const SORT_LABELS: Record<MeetSort, string> = {
	recent: "Most recent",
	upcoming: "Upcoming first",
};

export default function AllMeets() {
	const { user, loading: authLoading } = useAuth()
	const [fetchError, setFetchError] = useState<string>("")
	const [meets, setMeets] = useState<Meet[]>([])
	const [firstPageLoading, setFirstPageLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(false)
	const [attendeeCountByMeet, setAttendeeCountByMeet] = useState<AttendeeCountMap>({})
	const [attendingMeetIds, setAttendingMeetIds] = useState<AttendingSet>(new Set())
	const [organizerNames, setOrganizerNames] = useState<OrganizerNameMap>({})
	const [sortOrder, setSortOrder] = useState<MeetSort>("recent")
	const [showPast, setShowPast] = useState(false)

	const profileId = user?.id ?? null

	// Paging state lives in refs so scroll-triggered loads never see stale values.
	const cursorRef = useRef<MeetCursor | null>(null)
	const loadingRef = useRef(false)
	// Bumped whenever the query (sort, toggle, user) changes so late responses are discarded.
	const generationRef = useRef(0)
	const knownOrganizersRef = useRef<Set<string>>(new Set())

	const scrollRef = useRef<HTMLDivElement | null>(null)
	const sentinelRef = useRef<HTMLDivElement | null>(null)

	const loadNextPage = useCallback(async (isFirstPage: boolean) => {
		const cursor = cursorRef.current
		if (!cursor || loadingRef.current) return

		const generation = generationRef.current
		loadingRef.current = true
		if (isFirstPage) setFirstPageLoading(true)
		else setLoadingMore(true)

		try {
			const { meets: page, error } = await fetchMeetPage(cursor, sortOrder)
			if (generation !== generationRef.current) return

			if (error) {
				setFetchError('Error fetching meets.')
				cursorRef.current = null
				setHasMore(false)
				return
			}
			setFetchError("")

			const next = nextCursor(cursor, sortOrder, showPast, page.length)
			cursorRef.current = next
			setHasMore(next !== null)
			setMeets((prev) => (isFirstPage ? page : [...prev, ...page]))

			if (page.length === 0) return

			// Counts and "you're attending" for just this page, plus organizer names not seen yet.
			const newOrganizerIds = [...new Set(
				page.map((m) => m.organizerId).filter((id): id is string => !!id && !knownOrganizersRef.current.has(id)),
			)]
			newOrganizerIds.forEach((id) => knownOrganizersRef.current.add(id))

			const [summary, profiles] = await Promise.all([
				fetchAttendeeSummary(page.map((m) => m.id)),
				newOrganizerIds.length > 0
					? supabase.from('profiles').select('id, username').in('id', newOrganizerIds)
					: Promise.resolve({ data: [] as Array<{ id: string; username: string | null }> }),
			])
			if (generation !== generationRef.current) return

			setAttendeeCountByMeet((prev) => {
				const merged = { ...prev }
				for (const m of page) merged[String(m.id)] = summary[String(m.id)]?.count ?? 0
				return merged
			})
			setAttendingMeetIds((prev) => {
				const merged = new Set(prev)
				for (const m of page) {
					if (summary[String(m.id)]?.attending) merged.add(String(m.id))
				}
				return merged
			})
			setOrganizerNames((prev) => {
				const merged = { ...prev }
				for (const p of profiles.data ?? []) merged[p.id] = p.username ?? 'Unknown author'
				return merged
			})
		} finally {
			if (generation === generationRef.current) {
				loadingRef.current = false
				setFirstPageLoading(false)
				setLoadingMore(false)
			}
		}
	}, [sortOrder, showPast])

	// (Re)start from page one whenever the query changes. Wait for auth so attendance is correct.
	useEffect(() => {
		if (authLoading) return
		generationRef.current += 1
		loadingRef.current = false
		cursorRef.current = initialCursor(sortOrder, showPast)
		knownOrganizersRef.current = new Set()
		void loadNextPage(true)
		// Use user id, not `user`: Supabase refreshes the session when the tab is focused and
		// passes a new User object reference, which would otherwise restart the list.
	}, [authLoading, user?.id, sortOrder, showPast, loadNextPage])

	// Infinite scroll: load the next page when the sentinel at the end of the grid comes into view.
	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel || !hasMore || firstPageLoading || loadingMore) return
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) void loadNextPage(false)
			},
			{ root: scrollRef.current, rootMargin: "300px" },
		)
		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [hasMore, firstPageLoading, loadingMore, meets.length, loadNextPage])

	if (authLoading || (firstPageLoading && meets.length === 0)) {
		return (
			<div className="flex">
				<div className="flex-1 mx-[5vw] mt-5 min-h-[50vh] flex flex-col items-center justify-center gap-4">
					<Spinner size="lg" label="" />
					<p className="text-lg text-foreground/80">Connecting to Blip…</p>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-[5vw] mt-5 flex min-h-0 min-w-0 flex-col overflow-x-hidden h-[calc(100vh-170px)]">

			<div className="flex flex-wrap items-center justify-between gap-3 mb-2">
				<h1 id="header" className="text-3xl font-bold">Browse Meets</h1>
				<div className="flex items-center gap-3">
					<Dropdown className="blip-main">
						<DropdownTrigger>
							<Button variant="bordered" endContent={<span className="text-default-400" aria-hidden>▼</span>}>
								{SORT_LABELS[sortOrder]}
							</Button>
						</DropdownTrigger>
						<DropdownMenu
							aria-label="Sort meets"
							selectedKeys={new Set([sortOrder])}
							selectionMode="single"
							onSelectionChange={(keys) => {
								const key = Array.from(keys)[0] as MeetSort;
								if (key) setSortOrder(key);
							}}
						>
							<DropdownItem key="recent">{SORT_LABELS.recent}</DropdownItem>
							<DropdownItem key="upcoming">{SORT_LABELS.upcoming}</DropdownItem>
						</DropdownMenu>
					</Dropdown>
					<Checkbox
						isSelected={showPast}
						onValueChange={setShowPast}
						aria-label="Show past meets"
					>
						Show past meets
					</Checkbox>
				</div>
			</div>

			{fetchError && (
				<div className="text-red-500 text-center py-2" role="alert">{fetchError}</div>
			)}

			<div
				ref={scrollRef}
				className="scrollbar-modern flex-1 min-h-0 min-w-0 grid grid-cols-1 content-start items-start sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 overflow-y-auto overflow-x-hidden pb-4"
			>
				{meets.map((meet: Meet) => (
					<div
						key={meet.id}
						className="min-w-0 w-full max-w-full self-start origin-center opacity-100 transition-opacity duration-200 ease-out hover:opacity-70"
					>
						<MeetCard
							meet={meet}
							profileId={profileId}
							organizerName={organizerNames[meet.organizerId ?? ''] ?? undefined}
							attendeeCount={attendeeCountByMeet[String(meet.id)] ?? 0}
							attendanceStatus={attendingMeetIds.has(String(meet.id))}
						/>
					</div>
				))}

				{!firstPageLoading && !loadingMore && !hasMore && !fetchError && meets.length === 0 && (
					<p className="col-span-full py-10 text-center text-foreground/70">
						No meets to show{showPast ? "" : " yet — try “Show past meets”"}.
					</p>
				)}

				{/* Sentinel for infinite scroll */}
				<div ref={sentinelRef} className="col-span-full flex h-10 items-center justify-center">
					{loadingMore && <Spinner size="sm" label="" />}
				</div>
			</div>
		</div>
	)
}
