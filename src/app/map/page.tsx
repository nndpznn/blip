"use client"

// imports
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useRef } from "react";
import { initMap, addEventMarkers } from "../../api/mapbox";
import { Event } from "../../types/event"

interface MapProps {
	events: Event[]
}

const Map: React.FC<MapProps> = ({ events = [] }) => {
	const router = useRouter()

	const mapContainerRef = useRef<HTMLDivElement>(null);

 	useEffect(() => {
		if (!mapContainerRef.current) return;

    	const map = initMap(mapContainerRef.current.id);
		
		// Once the map is loaded, add markers
		if (events.length > 0) {
			map.on("load", () => {
				addEventMarkers(map, events);
			});
		}


		return () => map.remove(); // Cleanup
  	}, [events]);

	return (
		<div>
			<button className="m-4 bg-blue-500 text-white px-4 py-2 rounded" type="button" onClick={() => router.push("/")}>go back</button>
			{/* <Link href="/">go back</Link> */}

			<br></br>

			<h1 className="italic font-bold text-8xl text-center">blip.</h1>

			<p className="italic text-4xl text-center">"welcome in." - nolan and brenden</p>

			<br></br>

			<div className="flex justify-center items-center w-full h-[500px]">
				<div id="map" ref={mapContainerRef} className="w-full h-full" />
			</div>

			<p className="not-italic text-s text-center">see the map below!</p>

			<a className="absolute left-0 bottom-0 m-4 bg-blue-500 text-white px-4 py-2 rounded" href="https://github.com/nndpznn/carsNcoffeeFinder">link to documentation</a>


		</div>
	);
}

export default Map