"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from "react";
import { initMap } from "../../api/mapbox";
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/clients/supabaseClient';

// components
import { Button } from "@heroui/button";
import { Point } from 'geojson';

// customs
import Searchbar from '@/components/searchbar';
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import Meet from '@/models/meet';


export default function Map() {
	const router = useRouter()
	const { fullName } = useSupabaseUserMetadata()
	// can also access avatarUrl

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const [meets, setMeets] = useState<Meet[]>([]);

	useEffect(() => {
        if (!mapContainerRef.current) return;
        
        const map = initMap(mapContainerRef.current.id);
        mapRef.current = map;

        // Fetch data
        const fetchMeets = async () => {
            const { data, error } = await supabase.from('meets').select('*');
            if (!error && data) setMeets(data);
        };

        fetchMeets();

        return () => {
            if (mapRef.current) mapRef.current.remove();
        }
    }, []);

	useEffect(() => {
        const map = mapRef.current;
        if (!map || meets.length === 0) return;

        // Function to load the data onto the map
        const loadLayers = () => {
            // Check if source already exists (prevents duplicate errors during hot reloads)
            if (map.getSource('meets-source')) {
                (map.getSource('meets-source') as mapboxgl.GeoJSONSource).setData({
                    type: 'FeatureCollection',
                    features: meets.map(m => createFeature(m))
                });
                return;
            }

            // Create GeoJSON Source
            map.addSource('meets-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: meets.map(m => createFeature(m))
                },
                cluster: true, // Enable clustering for a cleaner UI
                clusterMaxZoom: 14,
                clusterRadius: 50
            });

            // Layer for Clusters (groups of meets)
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'meets-source',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#f87171', // Match your red-400 theme
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20, 100, 30, 750, 40
                    ]
                }
            });

            // Layer for cluster count text
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'meets-source',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                },
                paint: { 'text-color': '#ffffff' }
            });

            // Layer for individual meet points
            map.addLayer({
                id: 'unclustered-point',
                type: 'circle',
                source: 'meets-source',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#f87171',
                    'circle-radius': 8,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                }
            });

            // --- INTERACTIONS ---

            // Click on cluster: Zoom in
            map.on('click', 'clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });

				if (!features.length) return;

                const clusterId = features[0].properties?.cluster_id;
				if (typeof clusterId === 'number') {
						const source = map.getSource('meets-source') as mapboxgl.GeoJSONSource;
						
						source.getClusterExpansionZoom(
							clusterId,
							(err, zoom) => {
								// 3. Zoom safety check
								if (err || typeof zoom !== 'number') return;

								// 4. Type cast geometry to Point to access coordinates safely
								const geometry = features[0].geometry as Point;

								map.easeTo({
									center: geometry.coordinates as [number, number],
									zoom: zoom
								});
							}
						);
					}
            });

            // Click on point: Show Popup & Navigate
            map.on('click', 'unclustered-point', (e) => {
				if (!e.features || e.features.length === 0) return;

			const feature = e.features[0];
			const geometry = feature.geometry as Point;
			const props = feature.properties;

			// 2. Safely extract and type the coordinates
			// .slice() is good practice to prevent accidental mutation
			const coordinates = [...geometry.coordinates] as [number, number];

			// 3. Create the Popup
			new mapboxgl.Popup({ offset: 15, className: 'dark-popup' })
				.setLngLat(coordinates)
				.setHTML(`
					<div class="p-2 text-black">
						<h3 class="font-bold">${props?.title || 'Untitled Meet'}</h3>
						<p class="text-xs">${props?.name || ''}</p>
						<button id="popup-btn" class="mt-2 bg-red-400 text-white text-[10px] px-2 py-1 rounded hover:bg-red-500 transition-colors">
							View Meet
						</button>
					</div>
				`)
				.addTo(map);
			
			// 4. Use a small timeout or event delegation to ensure the button exists in the DOM
			// Mapbox popups are injected into the DOM asynchronously.
			setTimeout(() => {
				const btn = document.getElementById('popup-btn');
				if (btn) {
					btn.onclick = () => {
						if (props?.id) {
							router.push(`/meet/${props.id}`);
						}
					};
				}
			}, 0);
		});

            // Hover effects
            map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');
            map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '');
        };

        if (map.isStyleLoaded()) {
            loadLayers();
        } else {
            map.on('load', loadLayers);
        }

    }, [meets, router]);

    // Helper to transform Meet to GeoJSON Feature
    const createFeature = (meet: Meet) => ({
        type: 'Feature' as const,
        geometry: {
            type: 'Point' as const,
            coordinates: meet.location.coordinates
        },
        properties: {
            id: meet.id,
            title: meet.title,
            name: meet.location.name,
            address: meet.location.address
        }
    });

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