import Meet from '@/models/meet';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";

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
    : 'No Date Provided';

    return (
        <Card
            isPressable
            onPress={() => router.push('/meet/${meet.id}')}
            className="w-full my-2 bg-red-600"
        >
            <CardBody className="p-0">
                <div className="flex w-full items-stretch">
                    <div className="w-1/5 bg-white p-2 flex items-center justify-center">
                        <span className="text-black font-bold text-center">Thumbnail</span>
                    </div>

                    <div className="flex flex-1 justify-between items-center p-4 text-white">
                        <p className="texr-xl font-bold">{meet.title}</p>
                        <div className="text-right">
                            <p className="font-semibold">by {username}</p>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}