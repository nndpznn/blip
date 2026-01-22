'use client'

// huh
import { Button } from "@heroui/button"
import { Input, Textarea, Alert, TimeInput} from "@heroui/react";
import { useRouter } from 'next/navigation'

import {Calendar} from '@heroui/calendar'
import {Time, today, getLocalTimeZone, CalendarDate} from "@internationalized/date";

import { useState, useRef } from "react";
import Meet from '@/models/meet'
import { LocationData } from "@/models/meet";
import { useAuth } from "@/clients/authContext";
import Searchbar from "@/components/searchbar";

export default function Create() {
	const router = useRouter()
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	// const mapContainer = useRef<HTMLDivElement | null>(null);
	// const map = useRef<mapboxgl.Map | null>(null);

	const [title, setTitle] = useState('')
	const [location, setLocation] = useState<LocationData | null>(null);
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')
	const [imageFiles, setImageFiles] = useState<File[]>([])
	const [date, setDate] = useState<CalendarDate | null>(null)
	const [startTime, setStartTime] = useState<Time | null>()
	const [endTime, setEndTime] = useState<Time | null>()

	const [incAlertVisible, setIncAlertVisible] = useState(false)
	const { user } = useAuth();

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files) {
		  setImageFiles(Array.from(files)); // Convert FileList to an array
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
		setLocation(null)

	}
	const handleSubmit = async () => {
		console.log([title, body, links])

		if (!title || !body || !date || !startTime || !endTime || !location) {
			console.log("missing one or more required fields")
			setIncAlertVisible(true)
			return
		}

		const meet = new Meet(user!.id, title, body, links, location)
		meet.date = date
		meet.startTime = startTime
		meet.endTime = endTime

		await meet.uploadImages(imageFiles)

		await meet.saveToDatabase()

		console.log('form data submitted successfully.', meet)

		router.push("/seeAllMeets")
	}

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

	return (
		<div className="">

			<div className="mx-[5vw] mt-5 h-full">
				<h1 id="header" className="text-3xl font-bold mb-5">New Meet</h1>

				<div className="flex mb-5">
					<div id="fields" className="w-2/5">
						<p className="text-xl font-bold">Title</p>
						<Input value={title} onChange={e => setTitle(e.target.value)}size="md" type="text" />
						
						<p className="mt-5 text-xl font-bold">Body</p>
						<Textarea minRows={4} maxRows={4} value={body} onChange={e => setBody(e.target.value)} size="md" type="text" />
						
						<p className="mt-5 text-xl font-bold">Location</p>
						<Searchbar 
							onSelect={async (suggestion) => {
								if (!suggestion) return;

								try {
									// Use the sessionToken passed from the Searchbar
									const response = await fetch(
										`https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&session_token=${suggestion.sessionToken}`
									);

									if (!response.ok) throw new Error("Failed to retrieve location");

									const data = await response.json();
									const feature = data.features[0];

									setLocation({
										name: suggestion.name,
										address: suggestion.full_address || suggestion.name,
										mapbox_id: suggestion.mapbox_id,
										coordinates: feature.geometry.coordinates,
										metadata: {
											category: suggestion.poi_category || "address",
											is_poi: !!suggestion.poi_category
										}
									});
								} catch (error) {
									console.error("Retrieve error:", error);
								}
							}} 
						/>
						{/* <Input value={address} onChange={e => setAddress(e.target.value)}size="md" type="text" /> */}
						
						<p className="mt-5 text-xl font-bold">Links (Optional)</p>
						<Input value={links} onChange={e => setLinks(e.target.value)}size="md" type="text" />
					</div>

					<div id="calendar" className="w-2/5 ml-10 flex flex-col items-center">
						<div>
							<p className="w-full text-left text-xl font-bold">Date</p>

							<Calendar
							aria-label="Date (Min Date Value)"
							defaultValue={today(getLocalTimeZone())}
							minValue={today(getLocalTimeZone())}
							value={date}
							onChange={setDate}
							/>
						</div>

						{/* <Button color="primary" onPress={() => console.log(date)}>Print date to console</Button> */}
					</div>

					<div id="misc" className="flex flex-col w-1/5 ml-10">
						<p className="mt-5 text-xl font-bold">Start Time</p>
						{/* <Input value={startTime} onChange={e => setStartTime(e.target.value)}size="md" type="text" /> */}
						<TimeInput value={startTime} onChange={setStartTime} label="Start Time" />

						<p className="mt-5 text-xl font-bold">End Time</p>
						{/* <Input value={endTime} onChange={e => setEndTime(e.target.value)}size="md" type="text" /> */}
						<TimeInput value={endTime} onChange={setEndTime} label="End Time" />

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

				<Button color="primary" className="mx-3 bg-primary-700" onPress={handleClear}>Clear</Button>
				<Button color="primary" isDisabled={true} className="mx-3">Save Draft</Button>
				<Button color="primary" className="mx-3" onPress={handleSubmit}>Submit</Button>

				<Alert className="mt-5" title="Incomplete Meet"  description="Your meet is incomplete. Please fill out the required sections." isVisible={incAlertVisible}  onClose={() => setIncAlertVisible(false)}/>
				
			</div>
			
		</div>
	)
}