import Meet from '@/models/meet';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import {Image} from "@heroui/image";

interface MeetCardProps {
    meet: Meet;
}

export default function MeetCard({ meet }: MeetCardProps) {
    const router = useRouter();
    const [username, setUsername] = useState<String | null>()

    useEffect(() => {
            const resolveAuthor = async () => {
            if (meet) {
                const user = await fetchUserByUID(meet.organizerId)
                if (user) {
                    setUsername(user.fullname)
                }
            }
        }
        resolveAuthor()
        })

    const formattedDate = meet.date ? new Date(meet.date.toString()).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    })
    : 'No date found';

    return (
        <Card
            isPressable
            onPress={() => router.push(`/meet/${meet.id}`)}
            className="w-full my-2 bg-red-400 min-h-[200px]"
        >
            <CardBody className="p-0">
                <div className="flex w-full items-stretch min-h-[200px]">
                    <div className="w-1/5 bg-gray-500 p-2 flex items-center justify-center h-full">
                        {/* <span className="text-black text-center">lol</span> */}
                        {meet.images && meet.images.length > 0 ? (
                            <Image 
                                className="rounded-none w-full h-full object-cover" 
                                alt={meet.title} 
                                src={meet.images[0]} 
                            />
                        ) : (
                            <span className="text-black text-center font-bold text-sm">no vis...</span>
                        )}
                    </div>

                    <div className="flex flex-col flex-1 justify-start p-4 text-white">

                        <div className="flex w-full mb-2">
                            <div className="w-2/5 pr-4 shrink-0">
                                <p className="text-2xl font-bold line-clamp-4">{meet.title}</p>
                            </div>
                            
                            <div className="w-3/5 overflow-hidden">
                                <p className="text-base text-ellipsis line-clamp-4">{meet.body || "No description provided"}</p>
                            </div>
                        </div>

                        <div className="text-right text-lg pt-1 self-end mt-auto">
                            <p className="font-semibold">by {username || 'Unknown author'}</p>
                            <p className="text-medium">{formattedDate} // {meet.location.address}</p>
                        </div>

                    </div>
                </div>
            </CardBody>
        </Card>
    );
}