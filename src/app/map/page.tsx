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

export default function Map({ events = [] }: MapProps) {
	const router = useRouter()

	const mapContainerRef = useRef<HTMLDivElement>(null);

 	// useEffect(() => {
	// 	if (!mapContainerRef.current) return;

    // 	const map = initMap(mapContainerRef.current.id);
		
	// 	// Once the map is loaded, add markers
	// 	if (events.length > 0) {
	// 		map.on("load", () => {
	// 			addEventMarkers(map, events);
	// 		});
	// 	}


	// 	return () => map.remove(); // Cleanup
  	// }, [events]);

	return (
		<div className="flex flex-col w-full h-screen">

			<div id="nav" className="flex justify-center items-center gap-4 w-full py-4 border-b-8 border-red-400">
				<Button color="primary" className="absolute top-10 left-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/")}>go back</Button>

				<img src="../favicon.ico" className="flex w-[120px] h-[120px] cursor-pointer hover:opacity-75" onClick={() => router.push("/")}></img>

				<Button color="primary" className="absolute top-10 right-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/create")}>new meet</Button>
			</div>

			<div className="flex-1 w-full"> {/* could be border-t-4 */}
				{/* <div id="map" ref={mapContainerRef} className="flex w-[100vw] h-[70vh] text-center overflow-hidden" />   */}
				<div id="mapreplacement" className="flex w-[100vw] h-[70vh] text-center bg-gray-500 overflow-hidden"/>
			</div>

			<Button color="primary" className="m-4 hover:text-red-400" type="button" onPress={() => router.push("/meet/24")}>example meet</Button>

		</div>
	);
}