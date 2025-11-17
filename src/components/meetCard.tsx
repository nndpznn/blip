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

                        <div className="flex flex-col w-full mb-2">
                            <p className="text-2xl font-bold line-clamp-1 text-ellipsis">{meet.title}</p>  
                            <p className="text-base text-ellipsis line-clamp-1">{meet.body || "No description provided"}</p>
                        </div>

                        <div className="text-right text-md pt-1">
                            <p className="font-semibold">by {username || 'Unknown author'}</p>
                            <p className="text-medium line-clamp-1">{formattedDate} // {meet.location.address.split(',')[0]}</p>
                        </div>

                    </div>
                </div>
            </CardBody>
        </Card>
    );
}