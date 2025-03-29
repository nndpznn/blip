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
			setFetchError('Error fetching viDoc projects for this user.')
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
		<div className="mx-5 my-5">
			{meets?.map((meet: Meet) => (
				<p className="block w-fit cursor-pointer my-2 bg-red-400" onClick={() => router.push(`/meet/${meet.id}`)} key={meet.id}>{meet.title}</p>
			))}
		</div>
	)
}