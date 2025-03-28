'use client'

import Meet from "../../../models/meet"

import { Button } from "@heroui/button"
import {Image} from "@heroui/image";
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from "react";

import { supabase } from '@/clients/supabaseClient'

export default function MeetDetail() {

	const exampleMeet = new Meet("Placeholder Meet", "This is some placeholder text. Wow!", "", [-87.616, 41.776])

	const router = useRouter()
	const { id } = useParams()

	const [data, setData] = useState<Meet | null>(null)

	  // Fetching project information from Supabase based on page ID.
	  useEffect(() => {
		if (!id) return
	
		const fetchData = async () => {
		  const { data, error } = await supabase.from('meets').select('*').eq('id', id).single()
	
		  if (error) {
			console.error('There was an error fetching the meet.', error)
		  } else {
			setData(data)
		  }
		//   setLoading(false)
		}
	
		fetchData()
	  }, [id])

	if (!data)
	return (
		<div>
			<p>sum ting wong</p>
		</div>
	)

	return (
		<div className="flex">
			<div className="w-1/3 h-screen border-r-4 border-red-400">
				<Button color="primary" className="left-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/map")}>go back</Button>

				<p className="text-center font-bold text-4xl mx-6 mt-2">{data.title}</p>

					<p className="text-center text-xl mx-6 mt-2">Organized by PLACEHOLDER</p>

				<p className="text-center break-words mx-12 mt-12">{data.body} {data.body} {data.body} {data.body} {data.body} {data.body} {data.body} {data.body} {data.body}</p>

				<p className="text-center mt-12">
					<Button color="primary" className="text-center" type="button">Instagram</Button>
				</p>

				<p className="text-center mt-4">
					<Button color="primary" className="text-center" type="button">TikTok</Button>
				</p>
			</div>

			<div className="w-2/3 h-screen border-l-4 border-red-400">
				<Image className="rounded-none w-screen h-screen object-cover" alt="test" src="https://hips.hearstapps.com/hmg-prod/images/2025-porsche-718-cayman-101-66f6f7b824e6d.jpg" ></Image>
			</div>
		</div>
	);
}