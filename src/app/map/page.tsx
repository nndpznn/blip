"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from "react";
import { initMap, addEventMarkers } from "../../api/mapbox";
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/clients/supabaseClient';

// components
import {Button } from "@heroui/button";

// customs
import Searchbar from '@/components/searchbar';
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import Meet from '@/models/meet';

interface MapProps {
	events: Event[]
}

export default function Map({ events = [] }: MapProps) {
	const router = useRouter()

	const { avatarUrl, fullName } = useSupabaseUserMetadata()

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef([]);
	const [meets, setMeets] = useState<Meet[] | null>([]);
	const [loading, setLoading] = useState(true);

	const init = async () => {
		if (!mapContainerRef.current) return;
		const map = initMap(mapContainerRef.current.id);
		mapRef.current = map;

		setLoading(true);
		try {
			const { data, error } = await supabase.from('meets').select('*');
			if (error) {
				console.error('Error fetching meets:', error);
			}
			setMeets(data || []);
			} catch (error) {
				console.error('Unexpected error:', error);
			} finally {
				setLoading(false);
		}
	}

	useEffect(() => {
		init();

		return () => {
			if (mapRef.current) {
				mapRef.current.remove();
			}
		}
	}, [])

 	useEffect(() => {
		if (!mapRef.current) return;
		

		// Remove old markers
		// markersRef.current.forEach(marker => marker.remove());
		markersRef.current = [];

		// if (meets.length > 0) {
		// 	addEventMarkers(mapRef.current, meets);
		// }
  	}, [meets]);

	return (
		<div className="flex flex-col w-full h-full">

			<div className="flex-1 w-full">
				<div className="absolute z-10 p-4">
					<Searchbar onSelect={(place) => {
						const [lng, lat] = place.coordinates;
						mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 });
					}} />
				</div>

				<div id="map" ref={mapContainerRef} className="flex w-screen h-[70vh] text-center overflow-hidden" />  
				{/* <div id="mapreplacement" className="flex w-screen h-[70vh] text-center bg-gray-500 overflow-hidden"/> */}
			</div>

			<div className="grid grid-cols-3 items-center justify-between">
				<div className="col-start-1 justify-self-start">
					<Button 
						color="primary" 
						className="m-4 bg-red-400 hover:bg-red-500" 
						type="button" 
						onPress={() => router.push("/meet/39")}
					>example meet</Button>
				</div>
				<div className="col-start-2 justify-self-center">
					<p className="text-[2vh] m-4">hi there, <strong>{fullName}</strong>. looking for something cool to do?</p>
				</div>
				<div className="col-start-3 justify-self-end">
					
				</div>
			</div>

		</div>
	);
}