'use client'

import User from "@/models/user";

import { useParams } from 'next/navigation'
import { useEffect, useState } from "react";

import { supabase } from '@/clients/supabaseClient'

export default function UserDetail() {

	const params = useParams<{ id: string }>();
    const userId = params.id;

	const [user, setUser] = useState<User | null>(null)

	useEffect(() => {
		if (!userId) return
	
		const fetchData = async () => {
			const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
	
			if (error) {
				console.error('There was an error fetching the user.', error)
			} else {
				setUser(data)
			}
		}
	
		fetchData()
		}, [userId])

	return (
		<div>
			{(user) && (
				<div id="bgcolor" className="h-screen" style={{ backgroundColor: user?.profile_color || "#ff0000" }}>
					<div className="mx-[5vw] mt-5 h-full">
						<h1 className="text-8xl mb-2 font-bold">
							{user.username} ✓
						</h1>
						<p className="text-4xl italic">{user.fullname}</p>
					</div>
				</div>
			)}
		</div>
	)
}