'use client'

import { useEffect, useState } from "react";
import Meet from "@/models/meet";
import MeetCard from "@/components/meetCard"
import { supabase } from "@/clients/supabaseClient";

/** Maps meet id -> attendee count (from batch fetch). */
type AttendeeCountMap = Record<number, number>;
/** Set of meet ids the current user is attending. */
type AttendingSet = Set<number>;
/** Maps organizer profile id -> display name. */
type OrganizerNameMap = Record<string, string>;

export default function AllMeets() {
	const [fetchError, setFetchError] = useState<string>("")
	const [meets, setMeets] = useState<Meet[] | null>(null)
	const [profileId, setProfileId] = useState<string | null>(null)
	const [attendeeCountByMeet, setAttendeeCountByMeet] = useState<AttendeeCountMap>({})
	const [attendingMeetIds, setAttendingMeetIds] = useState<AttendingSet>(new Set())
	const [organizerNames, setOrganizerNames] = useState<OrganizerNameMap>({})

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
					.select('id, fullname')
					.in('id', organizerIds)
				const nameMap: OrganizerNameMap = {}
				if (profiles) for (const p of profiles) nameMap[p.id] = p.fullname ?? 'Unknown author'
				setOrganizerNames(nameMap)
			}
		}
		load()
	}, [])

	return (
		<div className="mx-[5vw] mt-5 flex flex-col h-[calc(100vh-150px)]">

			<h1 id="header" className="text-3xl font-bold mb-2">Browse Meets</h1>

			<div className="flex-1 p-5 grid grid-cols-3 gap-3 overflow-y-auto">
				{meets?.map((meet: Meet) => {
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