'use client'

import Meet from "@/models/meet"
import User from "@/models/user";

import { Button } from "@heroui/button"
import { Input, Textarea, TimeInput} from "@heroui/react";
import {Image} from "@heroui/image";
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/clients/authContext";

import {Calendar} from '@heroui/calendar'
import {Time, today, getLocalTimeZone, CalendarDate, parseDate} from "@internationalized/date";

import { supabase } from '@/clients/supabaseClient'
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import Searchbar from "@/components/searchbar";
import { LocationData } from "@/models/meet";

import UserCard from "@/components/userCard";
import { ReusableFadeInComponent } from "@/components/reusableFadeInComponent";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
} from "@heroui/react";

export default function MeetDetail() {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [title, setTitle] = useState('')
	const [address, setAddress] = useState('')
	const [location, setLocation] = useState<LocationData>({
		address: "Chicago Default Location",
		coordinates: [-87.616, 41.776] // Default coordinates
	}); 
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')
	const [imageFiles, setImageFiles] = useState<File[]>([])
	const [files, setFiles] = useState<File[]>([])
	const [date, setDate] = useState<CalendarDate>(today(getLocalTimeZone()))
	const [startTime, setStartTime] = useState<Time | null>()
	const [endTime, setEndTime] = useState<Time | null>()
	const [organizer, setOrganizer] = useState<User | null>()

	const { avatarUrl, uid, fullName, loading: metadataLoading } = useSupabaseUserMetadata()

	const [incAlertVisible, setIncAlertVisible] = useState(false)
	const { user, loading: authLoading, signOut } = useAuth();

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files) {
		  setFiles(Array.from(files)); // Convert FileList to an array
		}
	  };

	const handleUploadImagesPrompt = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	}

	const handleRemoveFile = (fileNameToRemove: string) => {
		setImageFiles(prevFiles => 
			prevFiles.filter(file => file.name !== fileNameToRemove)
		);
		// To re-enable uploading the same file name later, 
		// we need to reset the value of the hidden input:
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
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
		setLocation(meet?.location || {
			address: "Chicago Default Location",
			coordinates: [-87.616, 41.776] // Default coordinates
		})
	}

	const handleFill = () => {
		setTitle(meet?.title || '')
		setBody(meet?.body || '')
		setLinks(meet?.link || '')
		// setImageFiles(meet?.files || '')
		setDate(meet?.date ? parseDate(meet.date.toString()) : today(getLocalTimeZone()))
		setStartTime(null)
		setEndTime(null)
		setLocation(meet?.location || {
			address: "Chicago Default Location",
			coordinates: [-87.616, 41.776] // Default coordinates
		})
	}

	const handleEdit = async () => {
		console.log([title, body, links])

		const correctId = parseInt(meetId, 10)

		if (!title || !body || !date || !startTime || !endTime) {
			console.log("missing one or more required fields")
			setIncAlertVisible(true)
			return
		}

		const meet = new Meet(user!.id, title, body, links, 
			location)
		meet.id = correctId
		meet.date = date
		meet.startTime = startTime
		meet.endTime = endTime

		await meet.uploadImages(files)

		await meet.saveEditDatabase()

		console.log('form data submitted successfully.', meet)

		router.push("/seeAllMeets")
	}

	const {
		isOpen: isUserOpen, 
		onOpen: onUserOpen, 
		onOpenChange: onUserOpenChange
	} = useDisclosure()
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

	const router = useRouter()
	const params = useParams<{ id: string }>();
    const meetId = params.id;

	const [meet, setMeet] = useState<Meet | null>(null)

	// Fetching project information from Supabase based on page ID.
	useEffect(() => {
	if (!meetId) return

	const fetchData = async () => {
		const { data, error } = await supabase.from('meets').select('*').eq('id', meetId).single()

		if (error) {
		console.error('There was an error fetching the meet.', error)
		} else {
		setMeet(data)
		}
	//   setLoading(false)
	}

	fetchData()
	}, [meetId])

	useEffect(() => {
		const resolveAuthor = async () => {
		if (meet) {
			const user = await fetchUserByUID(meet.organizerId)
			if (user) {
				setOrganizer(user)
			}
		}
	}
	resolveAuthor()
	})

	useEffect(() => {

		if (isEditOpen && meet) {
			setTitle(meet?.title || '')
			setBody(meet?.body || '')
			setLinks(meet?.link || '')
			// setImageFiles(meet?.images || '') // FIX LATER
			setDate(meet?.date ? parseDate(meet.date.toString()) : today(getLocalTimeZone()))
			setStartTime(meet?.startTime) // FIX LATER
			setEndTime(meet?.endTime) // FIX LATER
			setLocation(meet.location)
		}
	  }, [meet, isEditOpen])

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

	if (!meet || !organizer)
	return (
		<div className="flex flex-col justify-center items-center">
			<p className="text-3xl my-3">...</p>
			<p className="text-xl my-3">Meet data not found. Maybe it's TOO underground...</p>
		</div>
	)

	return (
		<div className="flex justify-between">
			<div className="flex flex-col w-1/3 h-screen border-r-4 border-red-400">
				<div className="flex-1">
					{/* TITLE/HEADING */}
					<p className="text-center font-bold text-4xl mx-6 mt-2">{meet.title}</p>
					<p className="text-center text-xl mx-6 mt-2">On {meet.date ? meet.date.toString() : "No date found"}</p>

					<p className="text-center text-xl mx-6 mt-2">From {meet.startTime?.toString()} to {meet.endTime?.toString()}</p>					
					<p className="text-center text-xl mx-6 mt-2">Organized by <Button onPress={onUserOpen} className="text-xl">{organizer.username ? organizer.username : organizer.fullname}</Button></p>


					{/* CONTENT */}
					<p className="text-center wrap-break-word mx-12 mt-12">{meet.body}</p>

					<div id="buttoncontainer" className="flex flex-col">
						<Button color="primary" onPress={() => window.open("https://instagram.com/", "_blank", "noopener,noreferrer")} className="self-center mx-12 my-3" type="button">Instagram</Button>
						<Button color="primary" onPress={() => window.open("https://tiktok.com/", "_blank", "noopener,noreferrer")} className="self-center mx-12 my-3" type="button">TikTok</Button>
					</div>
				</div>

				{(meet.organizerId == uid) && (
					<div id="modifycontainer" className="flex sticky bottom-0 justify-between">
						<Button onPress={onEditOpen} className="mx-8 my-8">Edit</Button>
						<Button onPress={onDeleteOpen} className="mx-8 my-8">Delete</Button>
					</div>
				)}
			</div>

			{/* TO ADD: GALLERY FUNCTIONALITY */}
			<div className="w-2/3 h-screen border-l-4 border-red-400">
				{meet.images && (<Image className="rounded-none w-fit object-cover" alt="test" src={meet.images[0]} ></Image>)}
			</div>
			

			<ReusableFadeInComponent isOpen={isUserOpen} onClose={onUserOpenChange}>
				<UserCard 
					user={organizer}
				/>
			</ReusableFadeInComponent>

			{/* DELETE CONFIRM PROTOCOL */}
			<Drawer className="bg-black blip-main" isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} size="xs">
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
			<Drawer className="bg-black blip-main" isOpen={isEditOpen} onOpenChange={onEditOpenChange} size="full">
				<DrawerContent>
				{(onClose) => (
					<>
					<DrawerHeader className="flex flex-col gap-1">Edit Meet</DrawerHeader>
					<DrawerBody>
						<div className="flex mb-5">
							<div id="fields" className="w-2/5">
								<p className="text-xl font-bold">Title</p>
								<Input value={title} onChange={e => setTitle(e.target.value)}size="md" type="text" />
								
								<p className="mt-5 text-xl font-bold">Body</p>
								<Textarea minRows={4} maxRows={4} value={body} onChange={e => setBody(e.target.value)} size="md" type="text" />
								
								<p className="mt-5 text-xl font-bold">Location</p>
								<Searchbar initialValue={meet.location.address} onSelect={(place) => {
									if (place && place.center) {
										// Mapbox center is [longitude, latitude]
										const [lng, lat] = place.center; 
										
										setLocation({
											address: place.place_name,
											coordinates: place.center
										}); 

									}
								}} />
								{/* <Input value={address} onChange={e => setAddress(e.target.value)}size="md" type="text" /> */}
{/* 								
								<p className="mt-5 text-xl font-bold">Links (Optional)</p>
								<Input value={links} onChange={e => setLinks(e.target.value)}size="md" type="text" /> */}
							</div>

							<div id="calendar" className="w-2/5 ml-10 align-items-center">
								<p className="text-xl font-bold">Date</p>

								<Calendar
								aria-label="Date (Min Date Value)"
								defaultValue={today(getLocalTimeZone())}
								minValue={today(getLocalTimeZone())}
								value={date}
								onChange={setDate}
								/>

								{/* <Button color="primary" onPress={() => console.log(date)}>Print date to console</Button> */}
							</div>


							<div id="misc" className="flex flex-col w-1/5 ml-10">
								<p className="mt-5 text-xl font-bold">Start Time</p>
								{/* <TimeInput value={startTime} onChange={setStartTime} label="Start Time" /> */}

								<p className="mt-5 text-xl font-bold">End Time</p>
								{/* <TimeInput value={endTime} onChange={setEndTime} label="End Time" /> */}

								<p className="mt-5 text-xl font-bold">Upload Images</p>

								<input
								ref={fileInputRef}
								className="hidden"
								type="file"
								multiple
								accept="image/*"
								onChange={handleImageChange}
								/>

								<Button
								onPress={handleUploadImagesPrompt}
								color="primary"
								className="mt-1"
								>
									Upload
								</Button>

								<div className="mt-3 text-sm text-gray-600">
									{imageFiles.length > 0 ? (
									<div>
										<p className="font-medium text-green-600">
											{imageFiles.length} file(s) selected:
										</p>
										{imageFiles.map((file, index) => (
											<div 
												key={file.name + index} 
												className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200"
											>
												<span className="truncate mr-4">{file.name}</span>
												<button
													onClick={() => handleRemoveFile(file.name)}
													className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition duration-150"
													aria-label={`Remove file ${file.name}`}
												>
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
													</svg>
												</button>
											</div>
										))}
									</div>
									) : (
									<p className="text-gray-500">
										Click the button above to select images for upload.
									</p>
									)}
								</div>
								{/* <p>yes we know this looks not great</p> */}
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
							<Button color="primary" onPress={handleEdit}>
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