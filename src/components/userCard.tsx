import{ Button, Card, CardBody } from "@heroui/react";
import{ useRouter } from "next/navigation";
import User, { ProfileRow } from "@/models/user";

interface UserCardProps {
	user: User | ProfileRow
}

export default function UserCard({ user}: UserCardProps) {
	const router = useRouter();

	const handleViewProfile = () => {
		if (user.id) {
			router.push(`/user/${user.id}`);
		} else {
			console.error('There was an error fetching the user ID.');
		}
	};

    return (
		<Card
			className="border-none shadow-lg min-w[350px]"
			style={{ backgroundColor: user.profile_color || "#ff0000" }}
		>
			<CardBody className="p-8 text white">
				<div className="flex flex-col h-full">
					<div className="flex-1">
						<p className="my-2 text-5xl font-bold">
							{user.username ? user.username : "No username set"}
						</p>
						<p className="mb-2 text-2xl italic">
							{user.username ? user.fullname : "No full name set"}
						</p>
						<div className="space-y-1 text-lg">
							<p>
								<strong>currently:</strong> {user.headline ? user.headline: "No headline set"}
							</p>
							<p>
								<strong>bio:</strong> {user.bio ? user.bio: "No bio set"}
							</p>
						</div>
					</div>

					<div className="mt-8 flex justify-start">
						<Button
							onPress={handleViewProfile}
							className="bg-white text-black font-bold px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
						>
							View Full Profile
						</Button>
					</div>
				</div>
			</CardBody>
		</Card>
		// <div style={{ backgroundColor: `${user.profile_color}` }} className={`user-card-content p-8 rounded-xl`}>
		// 	<p className="my-2 text-5xl font-bold">{user.username ? user.username : "No username set"}</p>
		// 	<p className="mb-2 text-2xl italic">{user.fullname ? user.fullname : "No full name set"}</p>
		// 	<p className="my-2"><strong>currently:</strong> {user.headline ? user.headline : "No headline set"}</p>
		// 	<p className="my-2"><strong>bio:</strong> {user.bio ? user.bio : "No bio set"}</p>

		// 	<Button
		// 		className=
		// 	></Button>
		// </div>
    );
}