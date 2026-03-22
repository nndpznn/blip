import Meet from '@/models/meet';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import { Image } from "@heroui/image";
import { supabase } from '@/clients/supabaseClient'
import { usePageAccent } from "@/contexts/PageAccentContext";

/** Matches prior `h-90` intent (22.5rem) so grid cards stay a consistent size. */
const CARD_HEIGHT_CLASS = "h-[22.5rem]";

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
    const cardBgColor = isPast ? "bg-gray-600" : (accentColor ? "" : "bg-red-400");
    const cardStyle = !isPast && accentColor ? { backgroundColor: accentColor } : undefined;

    const stopCardPress = (e: MouseEvent | KeyboardEvent) => {
        e.stopPropagation();
    };

    return (
        <Card
            isPressable
            as="div"
            shadow="none"
            onPress={() => router.push(`/meet/${meet.id}`)}
            className={`my-1 ${CARD_HEIGHT_CLASS} w-full overflow-hidden rounded-xl border-0 bg-transparent p-0 ring-0 outline-none`}
            classNames={{
                base: "!bg-transparent border-none shadow-none ring-0 outline-none",
            }}
        >
            <CardBody className="!m-0 !min-h-0 !w-full !flex-1 !overflow-hidden !p-0 !shadow-none !ring-0 !bg-transparent">
                {/* Full-bleed layer — no side rail so the image spans the full card width */}
                <div
                    className={`flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-none ${cardBgColor}`}
                    style={cardStyle}
                >
                        {/* Image: no radius — only the Card clips top corners; bottom edge stays square vs body */}
                        <div className="relative h-3/5 min-h-0 w-full shrink-0 overflow-hidden rounded-none bg-black">
                            {meet.images && meet.images.length > 0 ? (
                                <Image
                                    removeWrapper
                                    disableSkeleton
                                    alt={meet.title}
                                    src={meet.images[0]}
                                    className="absolute inset-0 size-full min-h-full min-w-full rounded-none object-cover object-center"
                                />
                            ) : (
                                <>
                                    <Image
                                        removeWrapper
                                        disableSkeleton
                                        alt=""
                                        src="/assets/blip-bg.png"
                                        className="absolute inset-0 z-0 size-full min-h-full min-w-full rounded-none object-cover object-center"
                                    />
                                    <div className="absolute inset-0 z-10 flex items-center justify-center px-2">
                                        <span className="rounded-md bg-black/45 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white/95">
                                            No image
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                    {/* Text & actions — bottom cluster is mt-auto so it stays anchored regardless of description height */}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 text-white">
                        <div className="flex min-h-0 shrink-0 flex-col gap-1.5">
                            <div className="flex w-full min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">
                                        {meet.title}
                                    </h3>
                                    <p className="min-h-10 line-clamp-2 text-xs leading-relaxed text-white/85">
                                        {meet.body?.trim() ? meet.body : "No description provided"}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                        isPast ? "bg-black/25 text-white/80" : "bg-white/20 text-white"
                                    }`}
                                >
                                    {isPast ? "Past" : "Upcoming"}
                                </span>
                            </div>

                            <p className="line-clamp-1 text-[11px] text-white/75">
                                {formattedDate}
                                <span className="text-white/40"> · </span>
                                {meet.location.name}
                            </p>
                        </div>

                        <div className="mt-auto flex min-h-0 min-w-0 shrink-0 items-center gap-2 pt-1.5 text-xs">
                            <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                                <span className="shrink-0 text-white/60">Host</span>
                                <Link
                                    href={`/user/${meet.organizerId}`}
                                    onClick={stopCardPress}
                                    onKeyDown={stopCardPress}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="min-w-0 truncate rounded-md bg-white/15 px-1.5 py-0.5 font-medium text-white underline-offset-2 transition hover:bg-white/25 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                >
                                    {username || "Unknown"}
                                </Link>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 text-white/90">
                                <Image
                                    src="https://uxwing.com/wp-content/themes/uxwing/download/checkmark-cross/checkmark-white-icon.png"
                                    alt=""
                                    width={14}
                                    height={14}
                                    className="shrink-0 opacity-90"
                                />
                                <span className="font-semibold tabular-nums">{attendeeCount}</span>
                                <span className="text-white/60">attending</span>
                            </div>
                            <div
                                onClick={stopCardPress}
                                onKeyDown={stopCardPress}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="shrink-0"
                            >
                                <Button
                                    size="sm"
                                    radius="md"
                                    className="h-7 min-h-7 min-w-0 px-2.5 text-xs font-semibold"
                                    color="default"
                                    variant="flat"
                                    isDisabled={isPast}
                                    onPress={() => {
                                        handleRsvpToggle();
                                    }}
                                >
                                    {attendanceStatus ? "Attending" : "Attend"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}