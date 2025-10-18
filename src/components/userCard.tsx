import User from "@/models/user";

interface UserCardProps {
	user: User
}

export default function UserCard({ user}: UserCardProps) {

    return (
		<div style={{ backgroundColor: `${user.profile_color}` }} className={`user-card-content p-8 rounded-xl`}>
			<p className="my-2 text-5xl font-bold">{user.username ? user.username : "No username set"}</p>
			<p className="mb-2 text-2xl italic">{user.fullname ? user.fullname : "No full name set"}</p>
			<p className="my-2"><strong>currently:</strong> {user.headline ? user.headline : "No headline set"}</p>
			<p className="my-2"><strong>bio:</strong> {user.bio ? user.bio : "No bio set"}</p>
		</div>
    );
}