'use client'

import Meet, { isMeetImageOverLimit } from "@/models/meet"
import User from "@/models/user";

import { Button } from "@heroui/button"
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
  Input,
  Textarea,
  TimeInput,
} from "@heroui/react";
import {Image} from "@heroui/image";
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/clients/authContext";

import {Calendar} from '@heroui/calendar'
import { Time, today, getLocalTimeZone, CalendarDate, parseDate, parseTime } from "@internationalized/date";
import { to12Hour } from "@/util/politeTimeString";

import { supabase } from '@/clients/supabaseClient'
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { fetchUserByUID } from "@/hooks/fetchUserbyUID";
import Searchbar from "@/components/searchbar";
import { LocationData } from "@/models/meet";
import { moveItemDown, moveItemUp } from "@/util/reorderArray";

import UserCard from "@/components/userCard";
import MeetImageGallery from "@/components/MeetImageGallery";
import { ReusableFadeInComponent } from "@/components/reusableFadeInComponent";
import { CalendarIcon } from "@/assets/CalendarIcon";
import { MapPinIcon } from "@/assets/MapPinIcon";

const formatAddress = (address: string) => {
	if (address.includes(', United States')) {
		return address.slice(0, address.lastIndexOf(', United States'));
	}
	return address;
};

/** Last path segment of a stored image URL (upload filename), for display in the edit drawer. */
function fileLabelFromImageUrl(url: string): string {
	try {
		const path = new URL(url).pathname;
		const segments = path.split("/").filter(Boolean);
		return segments.length > 0 ? segments[segments.length - 1] : url;
	} catch {
		const i = url.lastIndexOf("/");
		return i >= 0 ? url.slice(i + 1) : url;
	}
}

/** Ordered slots for edit: existing URLs and new files can be interleaved (first = thumbnail). */
export type MeetEditImageSlot =
	| { type: "existing"; url: string }
	| { type: "pending"; id: string; file: File };

function PendingImagePreview({ file }: { file: File }) {
	const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
	useEffect(() => {
		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [objectUrl]);
	return (
		<Image
			src={objectUrl}
			alt=""
			className="h-16 w-16 object-cover rounded-lg"
			width={64}
			height={64}
		/>
	);
}

export default function MeetDetail() {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [title, setTitle] = useState('')
	const [location, setLocation] = useState<LocationData | null>(null);
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')
	const [imageSlots, setImageSlots] = useState<MeetEditImageSlot[]>([])
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
			const rejected: string[] = [];
			const allowed = Array.from(files).filter((file) => {
				if (isMeetImageOverLimit(file)) {
					rejected.push(file.name);
					return false;
				}
				return true;
			});
			if (rejected.length > 0) {
				alert(
					`These images exceed the max size of 10 MB and were not added:\n${rejected.join("\n")}`,
				);
			}
			if (allowed.length > 0) {
				setImageSlots((prev) => [
					...prev,
					...allowed.map((file) => ({
						type: "pending" as const,
						id: crypto.randomUUID(),
						file,
					})),
				]);
			}
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleUploadImagesPrompt = () => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
		}
	};

	const handleRemoveSlot = (indexToRemove: number) => {
		setImageSlots((prev) => prev.filter((_, i) => i !== indexToRemove));
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClear = (meetData: Meet | null) => {
		if (!meetData) return
		setTitle(meetData.title || '')
		setBody(meetData.body || '')
		setLinks((meetData as { links?: string; link?: string }).links ?? meetData.link ?? '')
		setImageSlots(
			(meetData.images ?? []).map((url) => ({ type: "existing" as const, url })),
		)
		setDate(meetData.date ? parseDate(meetData.date.toString()) : today(getLocalTimeZone()))
		setStartTime(meetData.startTime != null ? (typeof meetData.startTime === 'string' ? parseTime(meetData.startTime) : meetData.startTime) : null)
		setEndTime(meetData.endTime != null ? (typeof meetData.endTime === 'string' ? parseTime(meetData.endTime) : meetData.endTime) : null)
		setLocation(meetData.location)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
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

		if (!meet) {
			console.log("meet not loaded; cannot save")
			return
		}

		if (!title || !body || !date || !startTime || !endTime || !location) {
			console.log("missing one or more required fields")
			return
		}

		const meetToSave = new Meet(user!.id, title, body, links, location)
		// Use the id from the loaded row — parseInt(meetId) breaks UUID ids (e.g. parseInt("550e8400-...", 10) === 550).
		meetToSave.id = meet.id
		// Keep organizer exactly as stored (camelCase or snake_case from Supabase) so UPDATE matches RLS / row.
		const orgRow = meet as { organizerId?: string; organizer_id?: string };
		meetToSave.organizerId = orgRow.organizerId ?? orgRow.organizer_id ?? user!.id
		meetToSave.date = date
		meetToSave.startTime = startTime
		meetToSave.endTime = endTime

		const pendingFiles = imageSlots
			.filter((s): s is Extract<MeetEditImageSlot, { type: "pending" }> => s.type === "pending")
			.map((s) => s.file);
		const oversizedPending = pendingFiles.filter(isMeetImageOverLimit);
		if (oversizedPending.length > 0) {
			alert(
				`Remove or replace images over 10 MB: ${oversizedPending.map((f) => f.name).join(", ")}`,
			);
			return;
		}
		const newUrls = await meetToSave.uploadImages(pendingFiles, { assignToMeet: false });
		let j = 0;
		const finalImages: string[] = [];
		for (const slot of imageSlots) {
			if (slot.type === "existing") {
				finalImages.push(slot.url);
			} else {
				const u = newUrls[j];
				j += 1;
				if (u) finalImages.push(u);
			}
		}
		meetToSave.images = finalImages;

		const saved = await meetToSave.saveEditDatabase();
		if (!saved) return;

		console.log("form data submitted successfully.", meetToSave);
		router.push("/seeAllMeets");
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
			setLinks((meet as { links?: string; link?: string }).links ?? meet?.link ?? '')
			setImageSlots(
				(meet?.images ?? []).map((url) => ({ type: "existing" as const, url })),
			)
			setDate(meet?.date ? parseDate(meet.date.toString()) : today(getLocalTimeZone()))
			setStartTime(meet?.startTime != null ? (typeof meet.startTime === 'string' ? parseTime(meet.startTime) : meet.startTime) : null)
			setEndTime(meet?.endTime != null ? (typeof meet.endTime === 'string' ? parseTime(meet.endTime) : meet.endTime) : null)
			setLocation(meet.location)
		}
	  }, [meet, isEditOpen])

	/** Get storage path from a Supabase public URL (e.g. .../object/public/images/meetImages/foo.jpg -> meetImages/foo.jpg) */
	const getStoragePathFromPublicUrl = (publicUrl: string, bucket: string): string | null => {
		const prefix = `/object/public/${bucket}/`;
		const i = publicUrl.indexOf(prefix);
		if (i === -1) return null;
		return publicUrl.slice(i + prefix.length);
	};

	const onDelete = async (idToDelete: number | string) => {
		// Delete meet images from Supabase storage by URL
		const imageUrls = meet?.images ?? [];
		if (imageUrls.length > 0) {
			const bucket = 'images';
			const paths = imageUrls
				.map((url) => getStoragePathFromPublicUrl(url, bucket))
				.filter((path): path is string => path != null);
			if (paths.length > 0) {
				const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
				if (storageError) {
					console.error("Error deleting meet images from storage:", storageError);
				}
			}
		}

		const { data, error } = await supabase.from('meets').delete().eq("id", idToDelete);

		if (error) {
			console.error("Error deleting data:", error);
		} else {
			console.log("Data deleted successfully:", data);
		}
		router.push("/seeAllMeets");
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
						<p className="font-bold text-4xl flex-1 min-w-0 break-words text-center">{meet.title}</p>
						{(meet.organizerId == uid) && (
							<Dropdown className="blip-main shrink-0" placement="bottom-end">
								<DropdownTrigger>
									<Button isIconOnly variant="light" size="sm" aria-label="Meet options" className="text-white min-w-8">
										<span className="text-xl leading-none text-white">⋯</span>
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

			<div className="flex flex-col w-2/3 h-full min-h-0 overflow-hidden border-l-4 border-red-400 items-center justify-center">
				<div className="flex flex-1 w-[60vw] max-h-[60vh] min-h-0 items-center justify-center px-2">
					<MeetImageGallery
						key={meet.id}
						images={meet.images ?? []}
						title={meet.title}
					/>
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
								<TimeInput value={startTime} onChange={setStartTime} label="Start Time" />

								<p className="mt-5 text-xl font-bold">End Time</p>
								<TimeInput value={endTime} onChange={setEndTime} label="End Time" />

								<p className="mt-5 text-xl font-bold">Upload Images</p>
								<p className="mt-1 text-sm text-gray-600">Max 10 MB per image.</p>

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

								<div className="mt-3 text-sm text-gray-600 space-y-3">
									{imageSlots.length > 0 && (
										<div>
											<p className="font-medium text-foreground-700 mb-1">
												Images (top = thumbnail)
											</p>
											<div className="flex flex-col gap-2">
												{imageSlots.map((slot, index) => (
													<div
														key={
															slot.type === "existing"
																? `existing-${slot.url}-${index}`
																: slot.id
														}
														className="flex items-center gap-1 p-2 rounded-lg border border-default-200 bg-content1"
													>
														<div className="flex flex-col gap-0.5 shrink-0">
															<button
																type="button"
																disabled={index === 0}
																onClick={() =>
																	setImageSlots((prev) => moveItemUp(prev, index))
																}
																className="px-1.5 py-0.5 text-xs rounded border border-default-300 bg-white hover:bg-default-100 disabled:opacity-40 disabled:cursor-not-allowed"
																aria-label="Move image up"
															>
																↑
															</button>
															<button
																type="button"
																disabled={index === imageSlots.length - 1}
																onClick={() =>
																	setImageSlots((prev) => moveItemDown(prev, index))
																}
																className="px-1.5 py-0.5 text-xs rounded border border-default-300 bg-white hover:bg-default-100 disabled:opacity-40 disabled:cursor-not-allowed"
																aria-label="Move image down"
															>
																↓
															</button>
														</div>
														{slot.type === "existing" ? (
															<div className="relative inline-block rounded-lg border border-default-200 overflow-hidden shrink-0">
																<Image
																	src={slot.url}
																	alt="Meet"
																	className="h-16 w-16 object-cover rounded-lg"
																	width={64}
																	height={64}
																/>
															</div>
														) : (
															<div className="relative inline-block h-16 w-16 shrink-0 rounded-lg border border-default-200 overflow-hidden">
																<PendingImagePreview file={slot.file} />
																<span className="absolute top-0.5 right-0.5 z-10 rounded bg-green-600 px-1 py-px text-[10px] font-semibold leading-none text-white shadow-sm pointer-events-none">
																	New
																</span>
															</div>
														)}
														<span className="truncate mr-2 flex-1 min-w-0 text-foreground" title={slot.type === "existing" ? fileLabelFromImageUrl(slot.url) : slot.file.name}>
															{slot.type === "existing"
																? fileLabelFromImageUrl(slot.url)
																: slot.file.name}
														</span>
														<button
															type="button"
															onClick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																handleRemoveSlot(index);
															}}
															className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition shrink-0"
															aria-label="Remove image"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																className="h-4 w-4"
																viewBox="0 0 20 20"
																fill="currentColor"
															>
																<path
																	fillRule="evenodd"
																	d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
																	clipRule="evenodd"
																/>
															</svg>
														</button>
													</div>
												))}
											</div>
										</div>
									)}
									{imageSlots.length === 0 && (
										<p className="text-gray-500">
											No images. Click Upload to add current or new images.
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
							<Button color="primary" onPress={() => handleClear(meet)}>
								Restore
							</Button>
							<Button color="primary" onPress={handleEdit}>
							Confirm
							</Button>
						</DrawerFooter>
					</>
				)}
				</DrawerContent>
			</Drawer>
		</div>
	);
}