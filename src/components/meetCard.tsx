import Meet from '@/models/meet';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import {Image} from "@heroui/image";
import { supabase } from '@/clients/supabaseClient'
import { usePageAccent } from "@/contexts/PageAccentContext";

interface MeetCardProps {
    meet: Meet;
    /** When provided (e.g. from list page batch fetch), no per-card DB calls for attendance/organizer. */
    profileId?: string | null;
    organizerName?: string | null;
    attendeeCount?: number;
    attendanceStatus?: boolean;
}

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

const getCurrentProfileId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
    if (error || !profile) {
        console.error("Error fetching profile ID:", error);
        return null;
    }
    return profile.id;
};

export default function MeetCard({
    meet,
    profileId: profileIdProp,
    organizerName: organizerNameProp,
    attendeeCount: attendeeCountProp,
    attendanceStatus: attendanceStatusProp,
}: MeetCardProps) {
    const router = useRouter();
    const { accentColor } = usePageAccent();
    const preloaded =
        attendeeCountProp !== undefined &&
        attendanceStatusProp !== undefined &&
        profileIdProp !== undefined;

    const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
    const [resolvedProfileId, setResolvedProfileId] = useState<string | null>(null);
    const [resolvedAttendeeCount, setResolvedAttendeeCount] = useState(0);
    const [resolvedAttendanceStatus, setResolvedAttendanceStatus] = useState(false);
    const [attendanceOverride, setAttendanceOverride] = useState<{ count: number; attending: boolean } | null>(null);

    const username = organizerNameProp ?? resolvedUsername;
    const profileId = profileIdProp ?? resolvedProfileId;
    const attendeeCount = attendanceOverride
        ? attendanceOverride.count
        : (preloaded ? (attendeeCountProp ?? 0) : resolvedAttendeeCount);
    const attendanceStatus = attendanceOverride
        ? attendanceOverride.attending
        : (preloaded ? (attendanceStatusProp ?? false) : resolvedAttendanceStatus);

    useEffect(() => {
        if (organizerNameProp !== undefined) return;
        const resolveAuthor = async () => {
            const user = await fetchUserByUID(meet.organizerId);
            if (user) setResolvedUsername(user.username);
        };
        resolveAuthor();
    }, [meet.organizerId, organizerNameProp]);

    useEffect(() => {
        if (profileIdProp !== undefined) return;
        getCurrentProfileId().then(setResolvedProfileId);
    }, [profileIdProp]);

    useEffect(() => {
        if (preloaded) return;
        const fetchAttendance = async () => {
            const { count: total, error: countError } = await supabase
                .from('meet_attendees')
                .select('*', { count: 'exact', head: true })
                .eq('meet_id', meet.id);
            if (countError) console.error("Error fetching tally:", countError);
            else setResolvedAttendeeCount(total ?? 0);
            if (profileId) {
                const { count: userCount } = await supabase
                    .from('meet_attendees')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', profileId)
                    .eq('meet_id', meet.id);
                setResolvedAttendanceStatus(userCount ? userCount > 0 : false);
            }
        };
        fetchAttendance();
    }, [preloaded, profileId, meet.id, attendeeCountProp, attendanceStatusProp]);

    const handleRsvpToggle = async () => {
        if (!profileId) {
            console.warn("User not logged in. Cannot RSVP.");
            return;
        }

        let error = null;

        if (attendanceStatus) {
            // User is attending, so they want to un-RSVP (DELETE the record)
            const { error: deleteError } = await supabase
                .from('meet_attendees')
                .delete()
                .eq('profile_id', profileId)
                .eq('meet_id', meet.id);
            error = deleteError;
        } else {
            // User is not attending, so they want to RSVP (INSERT a new record)
            const { error: insertError } = await supabase
                .from('meet_attendees')
                .insert([
                    { 
                        profile_id: profileId, 
                        meet_id: meet.id,
                    }
                ]);
            error = insertError;
        }

        if (error) {
            console.error("Error updating RSVP:", error);
        } else {
            const newCount = attendanceStatus ? attendeeCount - 1 : attendeeCount + 1;
            const newAttending = !attendanceStatus;
            if (preloaded) {
                setAttendanceOverride({ count: newCount, attending: newAttending });
            } else {
                setResolvedAttendeeCount(newCount);
                setResolvedAttendanceStatus(newAttending);
            }
        }
    };

    const formattedDate = meet.date ? new Date(meet.date.toString()).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    })
    : 'No date found';

    const isPast = !isMeetInFuture(meet);
    const cardBgColor = isPast ? "bg-gray-500" : (accentColor ? "" : "bg-red-400");
    const cardStyle = !isPast && accentColor ? { backgroundColor: accentColor } : undefined;

    return (
        <Card
            isPressable
            as="div"
            onPress={() => router.push(`/meet/${meet.id}`)}
            className={`my-1 ${cardBgColor} h-90`}
            style={cardStyle}
        >
            <CardBody className="p-0 h-full min-h-0">
                <div className="flex flex-col h-full min-h-0">
                    <div className="bg-gray-500 flex items-center justify-center w-full h-3/5 min-h-0 overflow-hidden relative shrink-0">
                        {meet.images && meet.images.length > 0 ? (
                            <Image 
                                className="object-cover h-full w-full rounded-none" 
                                alt={meet.title} 
                                src={meet.images[0]} 
                            />
                        ) : (
                            <>
                                <div className="absolute inset-0 z-0">
                                    <Image 
                                        className="object-cover w-full h-full rounded-none" 
                                        alt="no image background" 
                                        src="/assets/blip-bg.png"
                                        removeWrapper={true}
                                    />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="text-white text-center font-bold text-2xl bg-black/30 px-3 py-1 rounded">no image provided</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col flex-1 justify-start p-4 text-white h-2/5">

                        <div className="flex w-full mb-2">
                            <div className="w-4/5">
                                <p className="text-2xl font-bold line-clamp-1 text-ellipsis">{meet.title}</p>  
                                <p className="text-base text-ellipsis line-clamp-1">{meet.body || "No description provided"}</p>
                            </div>
                            <div className="w-1/5 flex justify-end">
                                <Button disabled={isPast} className="w-8" onPress={() => {
                                    handleRsvpToggle();
                                }}>{attendanceStatus  ? "Attending!" : "Attend"}</Button>
                            </div>

                        </div>

                        <div className="flex justify-between items-end pt-1">
                            {/* NEW: Lower Left - Tally Icon & Count */}
                            <div className="flex items-center">
                                <Image
                                    src="https://uxwing.com/wp-content/themes/uxwing/download/checkmark-cross/checkmark-white-icon.png"
                                    alt="attendees"
                                    width={20}
                                    height={20}
                                    className="rounded-none"
                                />
                                <span className="font-bold text-lg leading-none">{attendeeCount}</span>
                            </div>

                            {/* Existing Lower Right - Author and Date */}
                            <div className="text-right text-md">
                                <p className="font-semibold">by {username || 'Unknown author'}</p>
                                <p className="text-medium line-clamp-1">
                                    {formattedDate} | {meet.location.name}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </CardBody>
        </Card>
    );
}