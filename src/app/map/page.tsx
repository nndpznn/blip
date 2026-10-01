"use client"

// imports
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from 'react-dom/client';
import { initMap, MAP_TEXT_FONT } from "../../api/map";
import * as maplibregl from 'maplibre-gl';
import { supabase } from '@/clients/supabaseClient';

// components
import { Button } from "@heroui/button";
import type { Point } from 'geojson';
import MeetPopup from '@/components/meetPopup';

// customs
import Searchbar from '@/components/searchbar';
import { useSupabaseUserMetadata } from '@/hooks/useSupabaseUserMetadata'
import { useLoginPrompt } from '@/hooks/useLoginPrompt'
import Meet from '@/models/meet';

export default function Map() {
	const router = useRouter()
	const { fullName, uid, loading: authLoading } = useSupabaseUserMetadata()
	const isGuest = !authLoading && !uid
	const promptLogin = useLoginPrompt()
	// can also access avatarUrl

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	// Marker for the place picked in the search bar; stays until another ping is clicked
	const searchPingRef = useRef<maplibregl.Marker | null>(null);
	const [meets, setMeets] = useState<Meet[]>([]);

	const clearSearchPing = () => {
		searchPingRef.current?.remove();
		searchPingRef.current = null;
	};

	const showSearchPing = (coordinates: [number, number], label: string) => {
		const map = mapRef.current;
		if (!map) return;
		clearSearchPing();

		// A blue teardrop pin with a name label above it, clearly unlike the flat red meet dots.
		const el = document.createElement('div');
		el.setAttribute('aria-label', `Selected location: ${label}`);
		Object.assign(el.style, {
			position: 'relative',
			width: '34px',
			height: '44px',
			// Let clicks fall through to the map so a meet ping underneath stays clickable
			pointerEvents: 'none',
		});

		// Pin graphic: static markup, no user-provided content
		el.innerHTML = `
			<svg width="34" height="44" viewBox="0 0 34 44" style="position:absolute;inset:0;filter:drop-shadow(0 3px 3px rgba(0,0,0,0.6));">
				<path d="M17 43 C17 43 3 27 3 16 A14 14 0 1 1 31 16 C31 27 17 43 17 43 Z" fill="#38bdf8" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
				<circle cx="17" cy="16" r="5.5" fill="#ffffff"/>
			</svg>`;

		// Label: the place name goes in via textContent so it can never be interpreted as HTML
		const labelEl = document.createElement('div');
		labelEl.textContent = label;
		Object.assign(labelEl.style, {
			position: 'absolute',
			bottom: '48px',
			left: '50%',
			transform: 'translateX(-50%)',
			width: 'max-content',
			maxWidth: '220px',
			padding: '4px 10px',
			borderRadius: '6px',
			background: 'rgba(75, 85, 99, 0.85)',
			color: '#ffffff',
			fontSize: '13px',
			fontWeight: '600',
			lineHeight: '1.3',
			textAlign: 'center',
			boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
			pointerEvents: 'none',
		});
		el.appendChild(labelEl);

		// Anchor at the pin's tip so it points at the exact location
		searchPingRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
			.setLngLat(coordinates)
			.addTo(map);
	};

	// Helper to transform Meet to GeoJSON Feature (must be declared before use in effects)
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

	useEffect(() => {
        if (!mapContainerRef.current) return;
        
        const map = initMap(mapContainerRef.current.id);
        mapRef.current = map;

        // Clicking any meet ping or cluster dismisses the searched-location ping.
        // Registered with the map (not with the meet layers) so it works regardless of when meets load.
        map.on('click', (e) => {
            const layers = ['clusters', 'unclustered-point'].filter((id) => map.getLayer(id));
            if (layers.length === 0) return;
            if (map.queryRenderedFeatures(e.point, { layers }).length > 0) clearSearchPing();
        });

        // Fetch data
        const fetchMeets = async () => {
            const { data, error } = await supabase.from('meets').select('*');
            if (!error && data) setMeets(data);
        };

        fetchMeets();

        return () => {
            clearSearchPing();
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
                (map.getSource('meets-source') as maplibregl.GeoJSONSource).setData({
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
                    'text-font': MAP_TEXT_FONT,
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

            const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

            // Shared: show popup for a list of meets at given coordinates (used for point clicks)
            const showMeetsPopup = (meetsToShow: Meet[], coordinates: [number, number]) => {
				if (meetsToShow.length === 0) return;
				const popup = new maplibregl.Popup({ offset: 15, className: 'dark-popup' }).setLngLat(coordinates);
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

            // Click on cluster: zoom and/or show popup depending on count and locations
            map.on('click', 'clusters', async (e) => {
                const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
                if (!features.length) return;

                const clusterProps = features[0].properties;
                const clusterId = clusterProps?.cluster_id;
                const pointCount = typeof clusterProps?.point_count === 'number' ? clusterProps.point_count : 0;

                if (typeof clusterId !== 'number' || pointCount === 0) return;

                const source = map.getSource('meets-source') as maplibregl.GeoJSONSource;
                let leaves: GeoJSON.Feature[];
                try {
                    leaves = await source.getClusterLeaves(clusterId, pointCount, 0);
                } catch (err) {
                    console.error('Error reading cluster leaves:', err);
                    return;
                }
                if (!leaves?.length) return;
                {

                    const coords = leaves.map((f) => (f.geometry as Point).coordinates);
                    const meetIds = leaves.map((f) => f.properties?.id).filter((id): id is number => id != null);
                    const meetsToShow = meetIds
                        .map((id) => meets.find((m) => String(m.id) === String(id)))
                        .filter((m): m is Meet => m != null);
                    if (meetsToShow.length === 0) return;

                    const lngs = coords.map((c) => c[0]);
                    const lats = coords.map((c) => c[1]);
                    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
                    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
                    const bounds = new maplibregl.LngLatBounds(sw, ne);
                    const center: [number, number] = [coords[0][0], coords[0][1]];
                    const allSameLocation = coords.every(
                        (c) => round5(c[0]) === round5(center[0]) && round5(c[1]) === round5(center[1])
                    );

                    if (meetsToShow.length === 1) {
                        // (a) Single ping: zoom to point, then open detail carousel
                        map.easeTo({ center, zoom: 14, duration: 400 });
                        map.once('moveend', () => showMeetsPopup(meetsToShow, center));
                    } else if (allSameLocation) {
                        // (c) 2+ pings at exact same location: zoom and open carousel to page between them
                        map.easeTo({ center, zoom: 14, duration: 400 });
                        map.once('moveend', () => showMeetsPopup(meetsToShow, center));
                    } else {
                        // (b) 2+ pings in region: fitBounds so user can click individual points
                        if (sw[0] === ne[0] && sw[1] === ne[1]) {
                            bounds.extend([sw[0] - 0.01, sw[1] - 0.01]);
                            bounds.extend([ne[0] + 0.01, ne[1] + 0.01]);
                        }
                        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 400 });
                    }
                }
            });

            // Click on point: show popup for meets at this location
            map.on('click', 'unclustered-point', (e) => {
                if (!e.features || e.features.length === 0) return;

                const feature = e.features[0];
                const featureId = feature.properties?.id;

                const clickedMeet = meets.find((m) => String(m.id) === String(featureId));
                if (!clickedMeet?.location?.coordinates) return;

                const [slng, slat] = clickedMeet.location.coordinates;
                const meetsAtLocation = meets.filter(
                    (m) =>
                        round5(m.location.coordinates[0]) === round5(slng) &&
                        round5(m.location.coordinates[1]) === round5(slat)
                );
                if (meetsAtLocation.length === 0) return;

                const popupCenter: [number, number] = [slng, slat];
                map.easeTo({ center: popupCenter, zoom: 12 });
                showMeetsPopup(meetsAtLocation, popupCenter);
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

	return (
		<div className="flex flex-col w-full h-full">

			<div className="flex-1 w-full">
				<div className="absolute z-10 p-4">
					<Searchbar
						getBias={() => {
							const center = mapRef.current?.getCenter();
							return center ? { lat: center.lat, lon: center.lng } : null;
						}}
						onSelect={(place) => {
							const [lng, lat] = place.coordinates;
							showSearchPing([lng, lat], place.name);
							mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 });
						}}
					/>
				</div>

				<div id="map" ref={mapContainerRef} className="flex w-screen h-[70vh] text-center overflow-hidden" />  
				{/* <div id="mapreplacement" className="flex w-screen h-[70vh] text-center bg-gray-500 overflow-hidden"/> */}
			</div>

			<div className="grid grid-cols-3 items-center justify-between mx-5">
				<div className="col-start-1 justify-self-start">
					{/* <Button 
						color="primary" 
						className="m-4 bg-red-400 hover:bg-red-500" 
						type="button" 
						onPress={() => router.push("/meet/39")}
					>example meet</Button> */}
                    <a className="flex items-center gap-2 hover:cursor-pointer hover:underline hover:underline-offset-4" onClick={() => router.push("/issue")}>Report an Issue</a>
				</div>
				<div className="col-start-2 justify-self-center">
					{isGuest ? (
						<p className="text-[2vh] m-4">
							Looking for something cool to do?{' '}
							<a className="font-bold underline underline-offset-4 hover:cursor-pointer" onClick={promptLogin}>Sign in</a>
							{' '}to attend meets and post your own.
						</p>
					) : (
						<p className="text-[2vh] m-4">Hi there, <strong>{fullName}</strong>. Looking for something cool to do?</p>
					)}
				</div>
				<div className="col-start-3 justify-self-end">
					
				</div>
			</div>

		</div>
	);
}