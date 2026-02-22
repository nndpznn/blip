"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from 'react-dom/client';
import { initMap } from "../../api/mapbox";
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/clients/supabaseClient';

// components
import { Button } from "@heroui/button";
import { Point } from 'geojson';
import MeetPopup from '@/components/meetPopup';

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
                    'text-size': 20
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

            // Shared: show popup for a list of meets at given coordinates (used for point clicks)
            const showMeetsPopup = (meetsToShow: Meet[], coordinates: [number, number]) => {
				if (meetsToShow.length === 0) return;
				const popup = new mapboxgl.Popup({ offset: 15, className: 'dark-popup' }).setLngLat(coordinates);
				const container = document.createElement('div');
				const root = createRoot(container);
				root.render(
					<MeetPopup
						meets={meetsToShow}
						onViewMeet={(id) => router.push(`/meet/${id}`)}
					/>
				);
				popup.setDOMContent(container);
				popup.once('close', () => {
					// Defer unmount to avoid "synchronously unmount a root while React was already rendering"
					queueMicrotask(() => root.unmount());
				});
				popup.addTo(map);
			};

            // Click on cluster: fit map to show all meets in the cluster (no popup — no meet at centroid)
            map.on('click', 'clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
				if (!features.length) return;

                const clusterProps = features[0].properties;
                const clusterId = clusterProps?.cluster_id;
                const pointCount = typeof clusterProps?.point_count === 'number' ? clusterProps.point_count : 0;

				if (typeof clusterId === 'number' && pointCount > 0) {
					const source = map.getSource('meets-source') as mapboxgl.GeoJSONSource;
					source.getClusterLeaves(clusterId, pointCount, 0, (err, leaves) => {
						if (err || !leaves?.length) return;
						const coords = leaves.map((f) => (f.geometry as Point).coordinates);
						const lngs = coords.map((c) => c[0]);
						const lats = coords.map((c) => c[1]);
						const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
						const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
						const bounds = new mapboxgl.LngLatBounds(sw, ne);
						// If single point, expand bounds slightly so zoom isn't maxed in
						if (sw[0] === ne[0] && sw[1] === ne[1]) {
							bounds.extend([sw[0] - 0.01, sw[1] - 0.01]);
							bounds.extend([ne[0] + 0.01, ne[1] + 0.01]);
						}
						map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 400 });
					});
				}
            });

            // Click on point: show popup for meets at this location
            map.on('click', 'unclustered-point', (e) => {
				if (!e.features || e.features.length === 0) return;

				const feature = e.features[0];
				const geometry = feature.geometry as Point;
				const coordinates = [...geometry.coordinates] as [number, number];

				const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
				const [clng, clat] = coordinates;
				const meetsAtLocation = meets.filter(
					(m) =>
						round5(m.location.coordinates[0]) === round5(clng) &&
						round5(m.location.coordinates[1]) === round5(clat)
				);
				if (meetsAtLocation.length === 0) return;

				map.easeTo({ center: coordinates, zoom: 14 });
				showMeetsPopup(meetsAtLocation, coordinates);
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