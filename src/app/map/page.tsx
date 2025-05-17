"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef } from "react";
import { initMap, addEventMarkers } from "../../api/mapbox";
import mapboxgl from 'mapbox-gl';
// components
import {Button, ButtonGroup} from "@heroui/button";
import Link from 'next/link';
import Image from "next/image";

// customs
import { Event } from "../../types/event"
import Searchbar from '@/components/searchbar';

interface MapProps {
	events: Event[]
}

export default function Map({ events = [] }: MapProps) {
	const router = useRouter()

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);


 	useEffect(() => {
		if (!mapContainerRef.current) return;

    	const map = initMap(mapContainerRef.current.id);
		mapRef.current = map;


		// const geocoder = new MapboxGeocoder({
		// 	accessToken: mapboxgl.accessToken!,
		// 	mapboxgl,
		// 	placeholder: "Search for an address",
		// 	marker: false,
		// 	flyTo: { zoom: 14 },
		// });
		
		// Once the map is loaded, add markers
		if (events.length > 0) {
			map.on("load", () => {
				addEventMarkers(map, events);
			});
		}


		return () => map.remove(); // Cleanup
  	}, [events]);

	return (
		<div className="flex flex-col w-full h-full">

			<div className="flex-1 w-full">
				<div className="absolute z-10">
					<Searchbar onSelect={(place) => {
						const [lng, lat] = place.center;
						mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 });
					}} />
				</div>

				<div id="map" ref={mapContainerRef} className="flex w-[100vw] h-[70vh] text-center overflow-hidden" />  
				{/* <div id="mapreplacement" className="flex w-[100vw] h-[70vh] text-center bg-gray-500 overflow-hidden"/> */}
			</div>

			<div className="flex justify-center justify-between">
				<Button color="primary" className="m-4 hover:text-red-400" type="button" onPress={() => router.push("/meet/10")}>example meet</Button>
				<Button color="primary" className="m-4 hover:text-red-400" type="button" onPress={() => router.push("/seeAllMeets")}>see meets</Button>
			</div>

		</div>
	);
}