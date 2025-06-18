'use client'

import Meet from "../../../models/meet"
import User from "../../../models/user"

import { Button } from "@heroui/button"
import { Input, Textarea, TimeInput} from "@heroui/react";
import {Image} from "@heroui/image";
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from "react";

import {Calendar} from '@heroui/calendar'
import {Time, today, getLocalTimeZone} from "@internationalized/date";

import { supabase } from '@/clients/supabaseClient'
import { parseDate, CalendarDate } from "@internationalized/date";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
} from "@heroui/react";

export default function MeetDetail() {
	const [title, setTitle] = useState('')
	const [address, setAddress] = useState('')
	const [location, setLocation] = useState([-87.616, 41.776]) 
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')
	const [imageFiles, setImageFiles] = useState<File[]>([])
	const [date, setDate] = useState<any>(null)
	const [startTime, setStartTime] = useState<Time | null>()
	const [endTime, setEndTime] = useState<Time | null>()

	const [incAlertVisible, setIncAlertVisible] = useState(false)

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files) {
		  setImageFiles(Array.from(files)); // Convert FileList to an array
		}
	  };

	const handleClear = () => {
		setTitle('')
		setAddress('')
		setBody('')
		setLinks('')
		setImageFiles([])
		setDate(today(getLocalTimeZone()))
		setStartTime(null)
		setEndTime(null)
		setLocation([-87.616, 41.776])
	}

	// const handleFill = () => {
	// 	setTitle(meet?.title || '')
	// 	setBody(meet?.body || '')
	// 	setLinks(meet?.link || '')
	// 	// setImageFiles(meet?.files || '')
	// 	setDate(today(getLocalTimeZone()))
	// 	setStartTime(null)
	// 	setEndTime(null)
	// 	setLocation([-87.616, 41.776])
	// }

	const handleEdit = async (e:any) => {
		console.log([title, body, links])

		if (!title || !body || !date || !startTime || !endTime) {
			console.log("missing one or more required fields")
			setIncAlertVisible(true)
			return
		}

		const meet = new Meet(title, body, links, [-87.616, 41.776])
		meet.date = date
		meet.startTime = startTime
		meet.endTime = endTime

		await meet.uploadImages(imageFiles)

		await meet.saveEditDatabase()

		console.log('form data submitted successfully.', meet)

		router.push("/seeAllMeets")
	}

	const {
		isOpen: isDeleteOpen, 
		onOpen: onDeleteOpen, 
		onOpenChange: onDeleteOpenChange
	} = useDisclosure()
	const {
		isOpen: isEditOpen, 
		onOpen: onEditOpen, 
		onOpenChange: onEditOpenChange
	} = useDisclosure()
	const exampleMeet = new Meet("Placeholder Meet", "This is some placeholder text. Wow!", "", [-87.616, 41.776])

	const exampleUser = new User("chris G.P. T. (gary payton two)", "areyousure@gmail.com")

	const router = useRouter()
	const { id } = useParams()

	const [meet, setMeet] = useState<Meet | null>(null)

	  // Fetching project information from Supabase based on page ID.
	  useEffect(() => {
		if (!id) return
	
		const fetchData = async () => {
		  const { data, error } = await supabase.from('meets').select('*').eq('id', id).single()
	
		  if (error) {
			console.error('There was an error fetching the meet.', error)
		  } else {
			setMeet(data)
		  }
		//   setLoading(false)
		}
	
		fetchData()
	  }, [id])

	if (!meet)
	return (
		<div>
			<p>sum ting wong</p>
		</div>
	)

	const onDelete = async (idToDelete: number) => {
		console.log(`ID: ${idToDelete}`)
		const {data, error} = await supabase.from('meets').delete().eq("id",idToDelete)

		if (error) {
			console.error("Error deleting data:", error);
		} else {
			console.log("Data deleted successfully:", data);
}
		router.push("/seeAllMeets")
	}

	const getCalendarDateFrom = (datetime: string): CalendarDate | null => {
		if (!datetime) {
			console.log("DATETIME NULL")
			return null;
		} 
		try {
			console.log("getCalendarDateFrom is executing: returns ", parseDate(datetime.split("T")[0]))
			return parseDate(datetime.split("T")[0]);
		} catch {
			return null;
		}
	}


	return (
		<div className="flex justify-between">
			<div className="flex flex-col w-1/3 h-screen border-r-4 border-red-400">
				<div className="flex-1">
					{/* TITLE/HEADING */}
					<p className="text-center font-bold text-4xl mx-6 mt-2">{meet.title}</p>
					<p className="text-center text-xl mx-6 mt-2">On {meet.date ? meet.date.toString() : "No date found"}</p>

					<p className="text-center text-xl mx-6 mt-2">From {meet.startTime?.toString()} to {meet.endTime?.toString()}</p>					
					<p className="text-center text-xl mx-6 mt-2">Organized by {exampleUser.name}</p>


					{/* CONTENT */}
					<p className="text-center break-words mx-12 mt-12">{meet.body}</p>

					<div id="buttoncontainer" className="flex flex-col">
						<Button color="primary" onPress={() => window.open("https://instagram.com/", "_blank", "noopener,noreferrer")} className="self-center mx-12 my-3" type="button">Instagram</Button>
						<Button color="primary" onPress={() => window.open("https://tiktok.com/", "_blank", "noopener,noreferrer")} className="self-center mx-12 my-3" type="button">TikTok</Button>
					</div>
				</div>

				<div id="modifycontainer" className="flex sticky bottom-0 justify-between justify-center">
					<Button onPress={onEditOpen} className="mx-8 my-8">Edit</Button>
					<Button onPress={onDeleteOpen} className="mx-8 my-8">Delete</Button>
				</div>
			</div>

			{/* TO ADD: GALLERY FUNCTIONALITY */}
			<div className="w-2/3 h-screen border-l-4 border-red-400">
				{meet.images && (<Image className="rounded-none w-fit object-cover" alt="test" src={meet.images[0]} ></Image>)}
			</div>

			{/* DELETE CONFIRM PROTOCOL */}
			<Drawer className="bg-black" isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} size="xs">
				<DrawerContent>
				{(onClose) => (
					<>
					<DrawerHeader className="flex flex-col gap-1">Delete Meet?</DrawerHeader>
					<DrawerBody>
						<p>
						This meet will never see the light of day... are you sure?
						</p>
					</DrawerBody>
					<DrawerFooter>
						<Button color="primary" onPress={onClose}>
						Close
						</Button>
						<Button color="primary" onPress={() => onDelete(meet.id)}>
						Delete
						</Button>
					</DrawerFooter>
					</>
				)}
				</DrawerContent>
			</Drawer>

			{/* EDIT CONFIRM PROTOCOL */}
			<Drawer className="bg-black" isOpen={isEditOpen} onOpenChange={onEditOpenChange} size="full">
				<DrawerContent>
				{(onClose) => (
					<>
					<DrawerHeader className="flex flex-col gap-1">Edit Meet</DrawerHeader>
					<DrawerBody>
						<div className="flex mb-5">
							<div id="fields" className="w-2/5">
								<p className="text-xl font-bold">Title</p>
								<Input value={meet.title} onChange={e => setTitle(e.target.value)}size="md" type="text" />
						
								<p className="mt-5 text-xl font-bold">Body</p>
								<Textarea minRows={4} maxRows={4} value={meet.body} onChange={e => setBody(e.target.value)} size="md" type="text" />
						
								<p className="mt-5 text-xl font-bold">Location</p>
								<Input value={address} onChange={e => setAddress(e.target.value)}size="md" type="text" />
						
								<p className="mt-5 text-xl font-bold">Links (Optional)</p>
								<Input value={links} onChange={e => setLinks(e.target.value)}size="md" type="text" />
							</div>

							<div id="calendar" className="w-1/5 ml-10">
								<p className="text-xl font-bold">Date</p>

								<Calendar
    							aria-label="Date (Min Date Value)"
      							defaultValue={today(getLocalTimeZone())}
      							minValue={today(getLocalTimeZone())}
    							/>
						</div>

					<div id="misc" className="w-2/5 ml-10">
						<p className="mt-5 text-xl font-bold">Start Time</p>
						{/* <Input value={startTime} onChange={e => setStartTime(e.target.value)}size="md" type="text" /> */}
						<TimeInput value={startTime} onChange={setStartTime} label="Start Time" />

						<p className="mt-5 text-xl font-bold">End Time</p>
						{/* <Input value={endTime} onChange={e => setEndTime(e.target.value)}size="md" type="text" /> */}
						<TimeInput value={endTime} onChange={setEndTime} label="End Time" />

						<p className="mt-5 text-xl font-bold">Upload Images</p>

						<input
						className="mt-5"
						type="file"
						multiple
						accept="image/*"
						onChange={handleImageChange}
						/>
					</div>
				</div>
					</DrawerBody>
					<DrawerFooter>
						<Button color="primary" onPress={onClose}>
						Cancel
						</Button>
						<Button color="primary" onPress={handleClear}>
						Clear
						</Button>
						<Button color="primary" onPress={() => handleEdit(meet.id)}>
						Edit
						</Button>
					</DrawerFooter>
					</>
				)}
				</DrawerContent>
			</Drawer>
		</div>
	);
}