'use client'

import { Button } from "@heroui/button"
import { Input, Textarea, Alert} from "@heroui/react";
import { useRouter } from 'next/navigation'
import Image from "next/image";

import { useState } from "react";

import { supabase } from '@/clients/supabaseClient'

export default function Create() {
	const router = useRouter()

	const [title, setTitle] = useState('')
	const [location, setLocation] = useState([-87.616, 41.776])
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')

	const [incAlertVisible, setIncAlertVisible] = useState(false)

	const handleClear = () => {
		setTitle('')
		setLocation([-87.616, 41.776])
		setBody('')
		setLinks('')

	}
	const handleSubmit = async (e:any) => {
		console.log([title, body, links])

		if (!title || !body) {
			console.log("no title or no body")
			setIncAlertVisible(true)
			return
		}

		// const {
		// 	data: { session },
		// 	error: sessionError,
		// } = await supabase.auth.getSession()

		// if (sessionError || !session) {
		// 	console.log('session not found')
		// 	return
		//   }

		// const userID = session.user.id

		const { data, error } = await supabase
			.from('meets')
			.insert([
				{
					organizer_id: 0,
					title: title,
					body: body,
					location: [-87.616, 41.776],
					links: links
				}
			])
			.select()

		if (error) {
			console.log("uh oh. submission error.", error)
			return
		}

		if (data) {
			console.log(data)
			console.log('form data submitted successfully.', title, body, links)
		}
	}

	return (
		<div className="">
			<div id="nav" className="flex justify-center items-center gap-4 w-full py-4 border-b-8 border-red-400">
				<Button color="primary" className="absolute top-10 left-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/map")}>go back</Button>

				<Image className="cursor-pointer hover:brightness-75" src="/favicon.ico" width={120} height={120} alt="Logo" onClick={() => router.push("/")}/>

				{/* <Button color="primary" className="absolute top-10 right-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/create")}>new meet</Button> */}
			</div>

			<div className="mx-[10vw] mt-20 h-full">

				<h1 id="header" className="text-3xl font-bold mb-5">New Meet</h1>

				<div className="flex">
					<div id="fields" className="w-2/5">
						<p className="mt-5 text-xl font-bold">Title</p>
						<Input value={title} onChange={e => setTitle(e.target.value)}size="md" type="text" />
						<p className="mt-5 text-xl font-bold">Body</p>
						<Textarea value={body} onChange={e => setBody(e.target.value)} size="md" type="text" />
						<p className="mt-5 text-xl font-bold">Location</p>
						<Input size="md" type="text" value={location.join(", ")} onChange={(e) => setLocation(e.target.value.split(",").map(Number))}/>
						<p className="mt-5 text-xl font-bold">Links (Optional)</p>
						<Input value={links} onChange={e => setLinks(e.target.value)}size="md" type="text" />
					</div>

					<div id="images" className="w-3/5 m-10 h-full">
						<div className="p-40 bg-[#171717] border border-red-400 rounded">
							wsg bb	
						</div>
					</div>
				</div>

				<Button color="primary" className="mx-3 bg-primary-700" onPress={handleClear}>Clear</Button>
				<Button color="primary" className="mx-3">Save Draft</Button>
				<Button color="primary" className="mx-3" onPress={handleSubmit}>Submit</Button>

				<Alert className="mt-5" title="Incomplete Meet"  description="Your meet is incomplete. Please fill out the required sections." isVisible={incAlertVisible}  onClose={() => setIncAlertVisible(false)}/>
				
			</div>
			
		</div>
	)
}