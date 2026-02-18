'use client'

import Meet from "@/models/meet"
import User from "@/models/user";

import { Button } from "@heroui/button"
import { Input, Textarea } from "@heroui/react";
import {Image} from "@heroui/image";
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/clients/authContext";

import {Calendar} from '@heroui/calendar'
import {Time, today, getLocalTimeZone, CalendarDate, parseDate} from "@internationalized/date";
import { to12Hour } from "@/util/politeTimeString";

import { supabase } from '@/clients/supabaseClient'
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import Searchbar from "@/components/searchbar";
import { LocationData } from "@/models/meet";

import UserCard from "@/components/userCard";
import { ReusableFadeInComponent } from "@/components/reusableFadeInComponent";
import { CalendarIcon } from "@/assets/CalendarIcon";
import { MapPinIcon } from "@/assets/MapPinIcon";

const formatAddress = (address: string) => {
	if (address.includes(', United States')) {
		return address.slice(0, address.lastIndexOf(', United States'));
	}
	return address;
};

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";

export default function MeetDetail() {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [title, setTitle] = useState('')
	const [location, setLocation] = useState<LocationData | null>(null);
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')
	const [imageFiles, setImageFiles] = useState<File[]>([])
	const [files, setFiles] = useState<File[]>([])
	const [date, setDate] = useState<CalendarDate>(today(getLocalTimeZone()))
	const [startTime, setStartTime] = useState<Time | null>()
	const [endTime, setEndTime] = useState<Time | null>()
	const [organizer, setOrganizer] = useState<User | null>()

	const { uid } = useSupabaseUserMetadata()

	// const [incAlertVisible, setIncAlertVisible] = useState(false)
	const { user } = useAuth();

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
		setBody('')
		setLinks('')
		setImageFiles([])
		setDate(today(getLocalTimeZone()))
		setStartTime(null)
		setEndTime(null)
		setLocation(meet?.location || null)
	}

	// working on alternative solution to refilling form with data. maybe cancel the edit instead of having to reset
	// const handleFill = () => {
	// 	setTitle(meet?.title || '')
	// 	setBody(meet?.body || '')
	// 	setLinks(meet?.link || '')
	// 	// setImageFiles(meet?.files || '')
	// 	setDate(meet?.date ? parseDate(meet.date.toString()) : today(getLocalTimeZone()))
	// 	setStartTime(null)
	// 	setEndTime(null)
	// 	setLocation(meet?.location || null)
	// }

	const handleEdit = async () => {
		console.log([title, body, links])

		const correctId = parseInt(meetId, 10)

		if (!title || !body || !date || !startTime || !endTime || !location) {
			console.log("missing one or more required fields")
			// setIncAlertVisible(true)
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
	const [attendanceStatus, setAttendanceStatus] = useState(false)
	const [attendeeCount, setAttendeeCount] = useState(0)

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
				if (user) setOrganizer(user)
			}
		}
		resolveAuthor()
	}, [meet])

	useEffect(() => {
		const fetchAttendance = async () => {
			if (!meet || !uid) return

			// Get total attendee count
			const { count: total, error: countError } = await supabase
				.from('meet_attendees')
				.select('*', { count: 'exact', head: true })
				.eq('meet_id', meet.id)
			
			if (countError) {
				console.error("Error fetching attendee count:", countError)
			} else {
				setAttendeeCount(total ?? 0)
			}

			// Check if current user is attending
			const { count: userCount } = await supabase
				.from('meet_attendees')
				.select('*', { count: 'exact', head: true })
				.eq('profile_id', uid)
				.eq('meet_id', meet.id)
			
			setAttendanceStatus(userCount ? userCount > 0 : false)
		}
		fetchAttendance()
	}, [meet, uid])

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

	const handleRsvpToggle = async () => {
		if (!uid || !meet) {
			console.warn("User not logged in or meet not loaded. Cannot RSVP.");
			return;
		}

		let error = null;

		if (attendanceStatus) {
			// User is attending, so they want to un-RSVP (DELETE the record)
			const { error: deleteError } = await supabase
				.from('meet_attendees')
				.delete()
				.eq('profile_id', uid)
				.eq('meet_id', meet.id);
			error = deleteError;
		} else {
			// User is not attending, so they want to RSVP (INSERT a new record)
			const { error: insertError } = await supabase
				.from('meet_attendees')
				.insert([
					{ 
						profile_id: uid, 
						meet_id: meet.id,
					}
				]);
			error = insertError;
		}

		if (error) {
			console.error("Error updating RSVP:", error);
		} else {
			// Flip the local state to reflect the successful database change
			setAttendeeCount(prev => attendanceStatus ? prev - 1 : prev + 1);
			setAttendanceStatus(!attendanceStatus);
		}
	};

	if (!meet || !organizer)
	return (
		<div className="flex flex-col justify-center items-center">
			<p className="text-3xl my-3">...</p>
			<p className="text-xl my-3">Meet data not found. Maybe it&apos;s TOO underground...</p>
		</div>
	)

	return (
		<div className="flex flex-1 w-full h-full min-h-[calc(100vh-8rem)]">
			<div className="flex flex-col w-1/3 h-full min-h-0 overflow-hidden border-r-4 border-red-400">
				<div className="flex-1 min-h-0 overflow-y-auto">
					{/* TITLE/HEADING + OPTIONS DROPDOWN */}
					<div className="flex items-center justify-between gap-2 mx-6 my-4">
						<p className="font-bold text-4xl flex-1">{meet.title}</p>
						{(meet.organizerId == uid) && (
							<Dropdown className="blip-main" placement="bottom-end">
								<DropdownTrigger>
									<Button isIconOnly variant="light" size="sm" aria-label="Meet options" className="shrink-0 text-foreground-500">
										<span className="text-xl leading-none">⋯</span>
									</Button>
								</DropdownTrigger>
								<DropdownMenu aria-label="Meet actions">
									<DropdownItem key="edit" onPress={onEditOpen}>Edit</DropdownItem>
									<DropdownItem key="delete" onPress={onDeleteOpen} className="text-danger" color="danger">Delete</DropdownItem>
								</DropdownMenu>
							</Dropdown>
						)}
					</div>

					{/* Compact date, time & location block */}
					<div className="mx-6 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
						<div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-base text-foreground/90">
							<CalendarIcon className="shrink-0 size-4 text-red-400/80" />
							<span className="font-medium">
								{meet.date
									? new Date(meet.date.toString()).toLocaleDateString("en-US", {
											weekday: "short",
											month: "short",
											day: "numeric",
											year: "numeric",
										})
									: "No date"}
							</span>
							<span className="text-white/50" aria-hidden>·</span>
							<span>
								{meet.startTime && meet.endTime
									? `${to12Hour(meet.startTime)} – ${to12Hour(meet.endTime)}`
									: meet.startTime
										? to12Hour(meet.startTime)
										: "—"}
							</span>
						</div>
						<div className="mt-2 flex items-center justify-start gap-1.5 text-sm text-foreground/80">
							<MapPinIcon className="shrink-0 size-4 text-red-400/80" />
							<span className="line-clamp-2 hover:underline hover:cursor-pointer" onClick={() => window.open(meet.mapsLink, "_blank", "noopener,noreferrer")}>{formatAddress(meet.location.address)}</span>
						</div>
					</div>

					{/* CONTENT */}
					<p className="text-center wrap-break-word mx-12 mt-12">{meet.body}</p>
				</div>

				{/* Bottom toolbar: organized by + attending */}
				<div className="shrink-0 mx-6 mb-6 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<span className="text-sm text-foreground/80">Organized by</span>
							<Button onPress={onUserOpen} size="sm" style={{ backgroundColor: organizer.profile_color || "#ff0000" }}>{organizer.username ? organizer.username : organizer.fullname}</Button>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onPress={handleRsvpToggle}
								size="sm"
								className={`px-4 transition-colors ${
									attendanceStatus
										? "bg-red-400 hover:bg-red-500 text-white"
										: "bg-gray-500 hover:bg-gray-600 text-white"
								}`}
							>
								{attendanceStatus ? "Attending!" : "Attend"}
							</Button>
							<div className="flex items-center gap-1">
								<Image
									src="https://uxwing.com/wp-content/themes/uxwing/download/checkmark-cross/checkmark-white-icon.png"
									alt="attendees"
									width={16}
									height={16}
									className="rounded-none"
								/>
								<span className="font-bold text-sm text-white">{attendeeCount}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* TO ADD: GALLERY FUNCTIONALITY */}
			<div className="flex flex-col w-2/3 h-full min-h-0 overflow-hidden border-l-4 border-red-400 items-center justify-center">
				<div className="flex-1 w-[60vw] flex items-center justify-center">
					{meet.images ? (
						<Image className="rounded-none" alt="Meet" src={meet.images[0]} />
					) : (
						<span className="text-foreground-500 text-sm">No image</span>
					)}
				</div>
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
								
								<p className="mt-5 text-xl font-bold">NEW Location (Leave blank if not changing)</p>
								<Searchbar 
									onSelect={async (suggestion) => {
										if (!suggestion) return;

										try {
											// Use the sessionToken passed from the Searchbar
											const response = await fetch(
												`https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&session_token=${suggestion.session_token}`
											);

											if (!response.ok) throw new Error("Failed to retrieve location");

											const data = await response.json();
											const feature = data.features[0];

											setLocation({
												name: suggestion.name,
												address: suggestion.address,
												mapbox_id: suggestion.mapbox_id,
												coordinates: feature.geometry.coordinates,
												metadata: {
													category: suggestion.metadata.category || "address",
													is_poi: !!suggestion.metadata.is_poi
												}
											});
										} catch (error) {
											console.error("Retrieve error:", error);
										}
									}} 
								/>
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