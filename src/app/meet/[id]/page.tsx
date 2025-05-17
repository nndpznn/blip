'use client'

import Meet from "../../../models/meet"
import User from "../../../models/user"

import { Button } from "@heroui/button"
import {Image} from "@heroui/image";
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from "react";

import { supabase } from '@/clients/supabaseClient'

export default function MeetDetail() {

	const exampleMeet = new Meet("Placeholder Meet", "This is some placeholder text. Wow!", "", [-87.616, 41.776])

	const exampleUser = new User("chris G.P. T. (gary payton two)", "areyousure@gmail.com")

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
		<div className="flex justify-between">
			<div className="flex flex-col w-1/3 h-screen border-r-4 border-red-400">
				<div className="flex-1">
					<p className="text-center font-bold text-4xl mx-6 mt-2">{data.title}</p>
					<p className="text-center text-xl mx-6 mt-2">Organized by {exampleUser.name}</p>
					<p className="text-center break-words mx-12 mt-12">{data.body}</p>

					<div id="buttoncontainer" className="flex flex-col">
						<Button color="primary" className="self-center mx-12 my-3" type="button">Instagram</Button>
						<Button color="primary" className="self-center mx-12 my-3" type="button">TikTok</Button>
					</div>
				</div>

				<div id="modifycontainer" className="flex sticky bottom-0 justify-between justify-center">
					<Button className="mx-8 my-8">Edit</Button>
					<Button className="mx-8 my-8">Delete</Button>
				</div>
			</div>
			
			{/* TO ADD: GALLERY FUNCTIONALITY */}
			<div className="w-2/3 h-screen border-l-4 border-red-400">
				{data.images && (<Image className="rounded-none w-fit object-cover" alt="test" src={data.images[0]} ></Image>)}
			</div>
		</div>
	);
}