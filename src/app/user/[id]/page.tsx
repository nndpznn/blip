'use client'

import User from "@/models/user";
import Meet from "@/models/meet";
import MeetCard from "@/components/meetCard"

import { useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from "react";

import { supabase } from '@/clients/supabaseClient'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Checkbox } from "@heroui/react";

/** Maps meet id -> attendee count (from batch fetch). */
type AttendeeCountMap = Record<number, number>;
/** Set of meet ids the current user is attending. */
type AttendingSet = Set<number>;

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

export default function UserDetail() {

	const params = useParams<{ id: string }>();
    const userId = params.id;

	const [user, setUser] = useState<User | null>(null)
	const [fetchError, setFetchError] = useState<string>("")
	const [meets, setMeets] = useState<Meet[] | null>(null)
	const [profileId, setProfileId] = useState<string | null>(null)
	const [attendeeCountByMeet, setAttendeeCountByMeet] = useState<AttendeeCountMap>({})
	const [attendingMeetIds, setAttendingMeetIds] = useState<AttendingSet>(new Set())
	const [sortOrder, setSortOrder] = useState<SortOption>("newest")
	const [showPast, setShowPast] = useState(false)

	useEffect(() => {
		if (!userId) return
	
		const fetchData = async () => {
			const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
	
			if (error) {
				console.error('There was an error fetching the user.', error)
			} else {
				setUser(data)
			}
		}
	
		fetchData()
	}, [userId])

	useEffect(() => {
		const load = async () => {
			if (!userId) return;

			// 1. Current user once (avoids N calls from each MeetCard)
			const { data: { user } } = await supabase.auth.getUser()
			const currentProfileId = user?.id ?? null
			setProfileId(currentProfileId)

			// 2. Meets created by this specific user
			const { data: meetsData, error: meetsError } = await supabase
				.from('meets')
				.select()
				.eq('organizerId', userId)
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
		}
		load()
	}, [userId])

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
		<div className="flex h-screen">
			{(user) && (
				<>
					{/* Left Column - User Info (1/4 width) */}
					<div id="bgcolor" className="w-1/4" style={{ backgroundColor: user?.profile_color || "#ff0000" }}>
						<div className="mx-[1vw] mt-5">
							{/* Username */}
							<h1 className="text-4xl mb-6 font-bold">
								{user.username}
							</h1>
							
							{/* User Details Widget */}
							<div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
								<div className="space-y-3">
									<div>
										<p className="text-xs text-white/70 uppercase tracking-wide mb-1">Full Name</p>
										<p className="text-lg font-semibold text-white">{user.fullname || 'Not provided'}</p>
									</div>
									<div>
										<p className="text-xs text-white/70 uppercase tracking-wide mb-1">Headline</p>
										<p className="text-sm text-white">{user.headline || 'No headline'}</p>
									</div>
									<div>
										<p className="text-xs text-white/70 uppercase tracking-wide mb-1">Bio</p>
										<p className="text-sm text-white/90 leading-relaxed">{user.bio || 'No bio available'}</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Right Column - Meets (3/4 width) */}
					<div className="w-3/4 flex flex-col">
						<div className="mx-[5vw] mt-5 flex-1 flex flex-col">
							<div className="flex flex-wrap items-center justify-between gap-3 mb-2">
								<h1 className="text-3xl font-bold">Meets by {user.username}</h1>
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
								<div className="text-red-500 text-center py-4">
									{fetchError}
								</div>
							)}

							<div className="scrollbar-modern flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto">
								{displayedMeets?.map((meet: Meet) => {
									const organizerId = (meet as { organizerId?: string; organizer_id?: string }).organizerId ?? (meet as { organizerId?: string; organizer_id?: string }).organizer_id
									return (
										<MeetCard
											key={meet.id}
											meet={meet}
											profileId={profileId}
											organizerName={user?.username || 'Unknown author'}
											attendeeCount={attendeeCountByMeet[meet.id] ?? 0}
											attendanceStatus={attendingMeetIds.has(meet.id)}
										/>
									)
								})}
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	)
}