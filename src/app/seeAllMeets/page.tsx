'use client'

import { useEffect, useState, useMemo } from "react";
import Meet from "@/models/meet";
import MeetCard from "@/components/meetCard"
import { supabase } from "@/clients/supabaseClient";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Checkbox } from "@heroui/react";

/** Maps meet id -> attendee count (from batch fetch). */
type AttendeeCountMap = Record<number, number>;
/** Set of meet ids the current user is attending. */
type AttendingSet = Set<number>;
/** Maps organizer profile id -> display name. */
type OrganizerNameMap = Record<string, string>;

type SortOption = "newest" | "oldest" | "upcoming" | "furthest";

const SORT_LABELS: Record<SortOption, string> = {
	newest: "Newest first",
	oldest: "Oldest first",
	upcoming: "Upcoming first",
	furthest: "Furthest first",
};

/** Raw meet row from Supabase may use date/startTime or date/start_time (strings). */
type MeetRow = { date?: string | null; startTime?: string | null; start_time?: string | null; created_at?: string };

function getMeetDateTime(meet: MeetRow): Date | null {
	const dateStr = meet.date != null ? String(meet.date) : null;
	if (!dateStr) return null;
	const timeStr = meet.startTime ?? meet.start_time;
	let iso = dateStr;
	if (timeStr) {
		const t = String(timeStr).replace("Z", "");
		iso = dateStr.includes("T") ? dateStr : `${dateStr}T${t.length <= 5 ? t + ":00" : t}`;
	} else if (!dateStr.includes("T")) {
		iso = `${dateStr}T23:59:59`;
	}
	const d = new Date(iso);
	return isNaN(d.getTime()) ? null : d;
}

function isMeetInFuture(meet: Meet): boolean {
	const d = getMeetDateTime(meet as unknown as MeetRow);
	return d != null && d.getTime() > Date.now();
}

export default function AllMeets() {
	const [fetchError, setFetchError] = useState<string>("")
	const [meets, setMeets] = useState<Meet[] | null>(null)
	const [profileId, setProfileId] = useState<string | null>(null)
	const [attendeeCountByMeet, setAttendeeCountByMeet] = useState<AttendeeCountMap>({})
	const [attendingMeetIds, setAttendingMeetIds] = useState<AttendingSet>(new Set())
	const [organizerNames, setOrganizerNames] = useState<OrganizerNameMap>({})
	const [sortOrder, setSortOrder] = useState<SortOption>("newest")
	const [showPast, setShowPast] = useState(false)

	useEffect(() => {
		const load = async () => {
			// 1. Current user once (avoids N calls from each MeetCard)
			const { data: { user } } = await supabase.auth.getUser()
			const currentProfileId = user?.id ?? null
			setProfileId(currentProfileId)

			// 2. All meets
			const { data: meetsData, error: meetsError } = await supabase
				.from('meets')
				.select()
				.order('created_at', { ascending: false })

			if (meetsError) {
				setFetchError('Error fetching meets for this user.')
				setMeets(null)
				return
			}
			if (!meetsData?.length) {
				setMeets([])
				setFetchError("")
				return
			}
			setMeets(meetsData as Meet[])
			setFetchError("")

			const meetIds = meetsData.map((m: { id: number }) => m.id)
			const organizerIds = [...new Set(meetsData.map((m: { organizerId?: string; organizer_id?: string }) => m.organizerId ?? m.organizer_id).filter(Boolean))] as string[]

			// 3. Single batch: all meet_attendees for these meets (counts + current user attendance)
			const { data: attendeesData } = await supabase
				.from('meet_attendees')
				.select('meet_id, profile_id')
				.in('meet_id', meetIds)

			const countMap: AttendeeCountMap = {}
			const attendingSet = new Set<number>()
			if (attendeesData) {
				for (const row of attendeesData) {
					const mid = row.meet_id as number
					countMap[mid] = (countMap[mid] ?? 0) + 1
					if (currentProfileId && row.profile_id === currentProfileId) attendingSet.add(mid)
				}
			}
			setAttendeeCountByMeet(countMap)
			setAttendingMeetIds(attendingSet)

			// 4. Single batch: organizer display names
			if (organizerIds.length > 0) {
				const { data: profiles } = await supabase
					.from('profiles')
					.select('id, username')
					.in('id', organizerIds)
				const nameMap: OrganizerNameMap = {}
				if (profiles) for (const p of profiles) nameMap[p.id] = p.username ?? 'Unknown author'
				setOrganizerNames(nameMap)
			}
		}
		load()
	}, [])

	const displayedMeets = useMemo(() => {
		if (!meets) return null;
		let list = showPast ? meets : meets.filter(isMeetInFuture);
		// Treat null meet time as end of list for time-based sorts
		const getSortTime = (meet: Meet) => getMeetDateTime(meet as unknown as MeetRow)?.getTime() ?? (sortOrder === "upcoming" ? Infinity : -Infinity);
		list = [...list].sort((a, b) => {
			if (sortOrder === "newest" || sortOrder === "oldest") {
				const aCt = (a as { created_at?: string }).created_at ?? "";
				const bCt = (b as { created_at?: string }).created_at ?? "";
				return sortOrder === "oldest" ? aCt.localeCompare(bCt) : bCt.localeCompare(aCt);
			}
			const aT = getSortTime(a);
			const bT = getSortTime(b);
			return sortOrder === "upcoming" ? aT - bT : bT - aT;
		});
		return list;
	}, [meets, sortOrder, showPast]);

	return (
		<div className="mx-[5vw] mt-5 flex flex-col h-[calc(100vh-170px)]">

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
								const key = Array.from(keys)[0] as SortOption;
								if (key) setSortOrder(key);
							}}
						>
							<DropdownItem key="newest">{SORT_LABELS.newest}</DropdownItem>
							<DropdownItem key="oldest">{SORT_LABELS.oldest}</DropdownItem>
							<DropdownItem key="upcoming">{SORT_LABELS.upcoming}</DropdownItem>
							<DropdownItem key="furthest">{SORT_LABELS.furthest}</DropdownItem>
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

			<div className="scrollbar-modern flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 overflow-y-auto pb-4">
				{displayedMeets?.map((meet: Meet) => {
					const organizerId = (meet as { organizerId?: string; organizer_id?: string }).organizerId ?? (meet as { organizerId?: string; organizer_id?: string }).organizer_id
					return (
						<MeetCard
							key={meet.id}
							meet={meet}
							profileId={profileId}
							organizerName={organizerNames[organizerId ?? ''] ?? undefined}
							attendeeCount={attendeeCountByMeet[meet.id] ?? 0}
							attendanceStatus={attendingMeetIds.has(meet.id)}
						/>
					)
				})}
			</div>
		</div>
	)
}