'use client'

import { useEffect, useState } from "react";
import Meet from "@/models/meet";
import { supabase } from "@/clients/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

export default function AllMeets() {
	const router = useRouter()

	const [fetchError, setFetchError] = useState<any>(null)
	const [meets, setMeets] = useState<Meet[] | null>(null)

	useEffect(() => {
		const fetchMeets = async () => {
		  const { data, error } = await supabase.from('meets').select().order('created_at', { ascending: false })
	
		  if (error) {
			setFetchError('Error fetching meets for this user.')
			setMeets(null)
			console.log(error)
		  }
		  if (data) {
			setMeets(data)
			setFetchError(null)
		  }
		}
	
		fetchMeets()
	  }, [])

	return (
		<div className="flex flex-col h-screen">
			<div className="flex-1 mx-5 my-5 overflow-auto">
				{meets?.map((meet: Meet) => (
					<p className="rounded-xl p-2 block w-fit cursor-pointer my-3 bg-red-400" onClick={() => router.push(`/meet/${meet.id}`)} key={meet.id}>{meet.title}</p>
				))}
			</div>
		</div>
	)
}