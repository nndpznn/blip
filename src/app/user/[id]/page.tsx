'use client'

import User from "@/models/user";

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from "react";

import { supabase } from '@/clients/supabaseClient'
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";

export default function UserDetail() {

	const router = useRouter()
	const params = useParams<{ id: string }>();
    const userId = params.id;

	const [user, setUser] = useState<User | null>(null)

	useEffect(() => {
		if (!userId) return
	
		const fetchData = async () => {
			const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
	
			if (error) {
			console.error('There was an error fetching the user.', error)
			} else {
			setUser(data)
			}
		//   setLoading(false)
		}
	
		fetchData()
		}, [userId])

	return (
		<div>
			<div className="mx-[5vw] mt-5 h-full">
				<h1 className="text-3xl font-bold mb-5">
					User ID is: <span className="text-red-500">{userId}</span>
				</h1>
			
			</div>
		</div>
	)
}