'use client'

import { Button } from "@heroui/button"
import { Input, Textarea} from "@heroui/input";
import { useRouter } from 'next/navigation'

import { useState } from "react";

import { supabase } from '@/clients/supabaseClient'

export default function Create() {
	const router = useRouter()

	const [title, setTitle] = useState('')
	const [location, setLocation] = useState([-87.616, 41.776])
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')

	const handlePress = () => {
		console.log("yippie")
	}
	const handleSubmit = async (e:any) => {
		console.log([title, body, links])

		if (!title || !body) {
			console.log("no title or no body")

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

				<img src="../favicon.ico" className="flex w-[120px] h-[120px] cursor-pointer hover:opacity-75" onClick={() => router.push("/")}></img>

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
						<Input size="md" type="text" />
						<p className="mt-5 text-xl font-bold">Links (Optional)</p>
						<Input value={links} onChange={e => setLinks(e.target.value)}size="md" type="text" />
					</div>

					<div id="images" className="w-3/5 m-10 h-full">
						<div className="p-40 bg-[#171717] border border-red-400 rounded">
							wsg bb	
						</div>
					</div>
				</div>

				<Button color="primary" className="mx-3 bg-primary-700">Clear</Button>
				<Button color="primary"className="mx-3">Save Draft</Button>
				<Button color="primary" className="mx-3" onPress={handleSubmit}>Submit</Button>
				
			</div>
			
		</div>
	)
}