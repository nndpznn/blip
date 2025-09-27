"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from "react";
import { initMap, addEventMarkers } from "../../api/mapbox";
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/clients/supabaseClient';

// components
import {Button, ButtonGroup} from "@heroui/button";
import Link from 'next/link';
import Image from "next/image";

// customs
import { Event } from "../../types/event"
import Searchbar from '@/components/searchbar';
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'

interface MapProps {
	events: Event[]
}

export default function Map({ events = [] }: MapProps) {
	const router = useRouter()

	const { avatarUrl, fullName, loading: metadataLoading } = useSupabaseUserMetadata()

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef([]);
	const [meets, setMeets] = useState<any[]>([]);
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
				<Button color="primary" className="m-4 hover:text-red-400" type="button" onPress={() => router.push("/meet/39")}>example meet</Button>
				<p className="text-[2vh] m-4">hi there, <strong>{fullName}</strong>. looking for something cool to do?</p>
				<Button color="primary" className="m-4 hover:text-red-400" type="button" onPress={() => router.push("/seeAllMeets")}>see meets</Button>
			</div>

		</div>
	);
}