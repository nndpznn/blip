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
            className="w-full my-2 bg-red-600 min-h-[200px]"
        >
            <CardBody className="p-0">
                <div className="flex w-full items-stretch min-h-[200px]">
                    <div className="w-1/5 bg-white p-2 flex items-center justify-center">
                        <span className="text-black text-center">lol</span>
                    </div>

                    <div className="flex flex-1 justify-between items-center p-4 text-white">
                        <p className="text-3xl font-bold">{meet.title}</p>
                        <div className="text-center text-ellipsis">
                            <p>{meet.body || "No description provided"}</p>
                        </div>
                        <div className="text-right text-xl">
                            <p className="font-semibold">by {username || 'Unknown author'}</p>
                            <p className="text-medium">{formattedDate} // {meet.location}</p>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}