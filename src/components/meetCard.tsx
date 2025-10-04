import Meet from '@/models/meet';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from "@heroui/react";

interface MeetCardProps {
    meet: Meet;
}

export default function MeetCard({ meet }: MeetCardProps) {
    const router = useRouter();

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
                
            </CardBody>
        </Card>
    );
}