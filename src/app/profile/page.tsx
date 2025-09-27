'use client'

import { useRouter } from "next/navigation";
import { useAuth } from "@/clients/authContext";

import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import { useEffect, useState } from "react";
import User from "@/models/user";

export default function Profile() {
	const router = useRouter()
	const [currentUser, setCurrentUser] = useState<User | null>()

	const { user, loading: authLoading, signOut } = useAuth();

	useEffect(() => {
		const resolveAuthor = async () => {
		if (user) {
			const data = await fetchUserByUID(user!.id)
			if (data) {
				setCurrentUser(data)
			}
		}
	}
	resolveAuthor()
	})

	if (!currentUser) {
		return (
			<div className="">
				Not found.
			</div>
		)
	}

	return (
		<div className="">
			<div className="mx-[5vw] mt-5 h-full">
				<h1 id="header" className="text-3xl font-bold mb-5">Your Profile</h1>

				<p>Username: {currentUser.username ? currentUser.username : "None"}</p>
				<p>Name: {currentUser.fullname ? currentUser.fullname : "None"}</p>
				<p>Headline: {currentUser.headline ? currentUser.headline : "None"}</p>
				<p>Bio: {currentUser.bio ? currentUser.bio : "None"}</p>

			</div>
		</div>
	)
}