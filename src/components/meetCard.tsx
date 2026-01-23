import Meet from '@/models/meet';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import {Image} from "@heroui/image";
import { supabase } from '@/clients/supabaseClient'

interface MeetCardProps {
    meet: Meet;
}

const getCurrentProfileId = async () => {
    // 1. Get the user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 2. Fetch the corresponding profile_id from your profiles table
    // Assumes your profiles table has a column linking back to the auth user ID.
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id) // Assuming your profiles.id is the auth.user.id
        .single();
    
    if (error || !profile) {
        console.error("Error fetching profile ID:", error);
        return null;
    }
    return profile.id;
};

export default function MeetCard({ meet }: MeetCardProps) {
    const router = useRouter();
    const [username, setUsername] = useState<string | null>()
    const [attendanceStatus, setAttendanceStatus] = useState(false);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [attendeeCount, setAttendeeCount] = useState(0);

    useEffect(() => {
        const resolveData = async () => {
            // Resolve Meet Author
            const user = await fetchUserByUID(meet.organizerId)
            if (user) {
                setUsername(user.fullname)
            }
            
            // Get Current User Profile ID
            const currentProfileId = await getCurrentProfileId();
            setProfileId(currentProfileId);
        }
        resolveData()
    }, [meet.organizerId]);

    useEffect(() => {
        const fetchAttendance = async () => {
            // Fetch Total Count For This Meet
            const { count: total, error: countError } = await supabase
                .from('meet_attendees')
                .select('*', { count: 'exact', head: true })
                .eq('meet_id', meet.id);

            if (countError) console.error("Error fetching tally:", countError);
            else setAttendeeCount(total || 0);

            // Check If Current User Is Attending
            if (profileId) {
                const { count: userCount } = await supabase
                    .from('meet_attendees')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', profileId)
                    .eq('meet_id', meet.id);
                
                setAttendanceStatus(userCount ? (userCount > 0) : false);
            }
        };

        fetchAttendance();
    }, [profileId, meet.id]);

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
            // Flip the local state to reflect the successful database change
            setAttendeeCount(prev => attendanceStatus ? prev - 1 : prev + 1);
            setAttendanceStatus(!attendanceStatus);
        }
    };

    const formattedDate = meet.date ? new Date(meet.date.toString()).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    })
    : 'No date found';

    return (
        <Card
            isPressable
            as="div"
            onPress={() => router.push(`/meet/${meet.id}`)}
            className="my-1 bg-red-400 h-90"
        >
            <CardBody className="p-0">
                <div className="flex flex-col h-full">
                    <div className="bg-gray-500 flex items-center justify-center w-full h-3/5 overflow-hidden">
                        {meet.images && meet.images.length > 0 ? (
                            <Image 
                                className="object-cover h-full w-full rounded-none" 
                                alt={meet.title} 
                                src={meet.images[0]} 
                            />
                        ) : (
                            <span className="text-black text-center font-bold text-sm">no vis...</span>
                        )}
                    </div>

                    <div className="flex flex-col flex-1 justify-start p-4 text-white h-2/5">

                        <div className="flex w-full mb-2">
                            <div className="w-4/5">
                                <p className="text-2xl font-bold line-clamp-1 text-ellipsis">{meet.title}</p>  
                                <p className="text-base text-ellipsis line-clamp-1">{meet.body || "No description provided"}</p>
                            </div>
                            <div className="w-1/5 flex justify-end">
                                <Button className="w-8" onPress={() => {
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