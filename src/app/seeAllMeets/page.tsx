'use client'

import { useEffect, useState } from "react";
import Meet from "@/models/meet";
import MeetCard from "@/components/meetCard"
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
		<div className="mx-[5vw] mt-5 flex flex-col h-screen">

			<h1 id="header" className="text-3xl font-bold mb-2">All Meets</h1>

			<div className="flex-1 min-h-0 p-5 grid grid-cols-3 gap-3 overflow-y-scroll">
				{meets?.map((meet: Meet) => (
					<MeetCard key={meet.id} meet={meet}/>
				))}
			</div>
		</div>
	)
}