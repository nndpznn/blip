'use client'

// huh
import { Button } from "@heroui/button"
import { Input, Textarea, Alert} from "@heroui/react";
import { useRouter } from 'next/navigation'
import Image from "next/image";

import {Calendar} from '@heroui/calendar'
import {today, getLocalTimeZone} from "@internationalized/date";

import mapboxgl from 'mapbox-gl';

import { useState, useRef, useEffect } from "react";
import Meet from '@/models/meet'

mapboxgl.accessToken = 'pk.eyJ1Ijoibm5kcHpubiIsImEiOiJjbTZxNmF1NjgxbDV5MmxwemlxOG13OG1lIn0.Akl1Y0JXLXH6eB0R6z9wkQ'


export default function Create() {
	const router = useRouter()
	const mapContainer = useRef<HTMLDivElement | null>(null);
	const map = useRef<mapboxgl.Map | null>(null);

	const [title, setTitle] = useState('')
	const [address, setAddress] = useState('')
	const [location, setLocation] = useState([-87.616, 41.776]) 
	const [body, setBody] = useState('')
	const [links, setLinks] = useState('')
	const [imageFiles, setImageFiles] = useState<File[]>([])
	const [date, setDate] = useState('')
	const [startTime, setStartTime] = useState('')
	const [endTime, setEndTime] = useState('')

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
		setDate(today(getLocalTimeZone()).toString())
		setStartTime('')
		setEndTime('')
		setLocation([-87.616, 41.776])

	}
	const handleSubmit = async (e:any) => {
		console.log([title, body, links])

		if (!title || !body) {
			console.log("no title or no body")
			setIncAlertVisible(true)
			return
		}

		const meet = new Meet(title, body, links, [-87.616, 41.776])
		meet.date = Meet.getCalendarDateFrom(date)
		meet.startTimeString = startTime
		meet.endTimeString = endTime

		await meet.uploadImages(imageFiles)

		await meet.saveToDatabase()

		console.log('form data submitted successfully.', meet)

		router.push("/seeAllMeets")
	}

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
						<Input value={startTime} onChange={e => setStartTime(e.target.value)}size="md" type="text" />

						<p className="mt-5 text-xl font-bold">End Time</p>
						<Input value={endTime} onChange={e => setEndTime(e.target.value)}size="md" type="text" />

						<p className="mt-5 text-xl font-bold">Upload Images</p>

						<input
						className="mt-5"
						type="file"
						multiple
						accept="image/*"
						onChange={handleImageChange}
						/>

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