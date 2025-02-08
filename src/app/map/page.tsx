"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from "react";
import { initMap, addEventMarkers } from "../../api/mapbox";

// components
import {Button, ButtonGroup} from "@heroui/button";
import Link from 'next/link';

// customs
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
		<div className="">

			<div className="flex justify-center items-center gap-4 mt-10">
				<Button color="primary" className="absolute top-4 left-4 m-4 px-4 py-2 hover:text-red-400" type="button" onPress={() => router.push("/")}>go back</Button>
				<img src="../favicon.ico" className="flex w-[150px] h-[150px]"></img>
			</div>

			<br></br>

			<div className="flex justify-center items-center w-full h-full mt-5 border-t-8 border-red-400"> {/* could be border-t-4 */}
				<div id="map" ref={mapContainerRef} className="flex w-[100vw] h-[65vh] text-center overflow-hidden" />  
				{/* <div id="mapreplacement" className="flex w-[100vw] h-[65vh] bg-gray-500"/> */}
			</div>

		</div>
	);
}

export default Map