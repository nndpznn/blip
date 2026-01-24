import { Button } from "@heroui/react";
import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid'; // You may need to install uuid

interface MapboxSuggestion {
  mapbox_id: string;
  name: string;
  full_address: string;
  poi_category?: string;
}

export interface SearchResult {
  name: string;
  address: string;
  mapbox_id: string;
  session_token: string;
  coordinates: [number, number];
  metadata: {
    category: string;
    is_poi: boolean;
  };
}

export default function Searchbar({
    onSelect,
    initialValue = "",
}: {
  onSelect: (result: SearchResult) => void;
  initialValue?: string;
}) {
    const [search, setSearch] = useState(initialValue);
    const [results, setResults] = useState<MapboxSuggestion[]>([]);
    
    // Search Box API requires a session token for billing efficiency
    const sessionToken = useMemo(() => uuidv4(), []);

	// useEffect(() => {
    //     console.log("Current Location State:", location);
    // }, [location]);

    useEffect(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            if (search.length < 3) {
                setResults([]);
                return;
            }
      
            // CHANGED: Using searchbox/v1/suggest for POI + Address support
            fetch(
              `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(search)}` +
              `&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}` +
              `&session_token=${sessionToken}` +
              `&limit=5` +
              `&country=US` + 
              `&bbox=-124.4,32.5,-114.1,42.0`, // <--- This locks it to California
              { signal: controller.signal }
            )
              .then((res) => res.json())
              .then((data) => {
                // Search Box returns 'suggestions' instead of 'features'
                setResults(data.suggestions || []);
              })
              .catch((err) => {
                if (err.name !== "AbortError") console.error(err);
              });
        }, 300);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [search, sessionToken]);

    return (
        <div className="relative w-screen max-w-md">
            <div className="relative w-full">
                <div className="flex items-center">
                    <input
                        type="text"
                        value={search}
                        placeholder="Search addresses or businesses..."
                        className="w-full p-2 bg-black text-gray-200 border border-gray-700 rounded-l-lg"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button radius="none" className="rounded-r-lg" onPress={() => {setSearch(""); setResults([]);}}>clear</Button>
                </div>
    
                {results.length > 0 && (
                <ul className="absolute z-50 bg-black border border-gray-700 rounded mt-1 w-full max-h-60 overflow-y-auto shadow-xl">
                {results.map((suggestion) => (
                    <li
						key={suggestion.mapbox_id}
						onClick={async () => {
							// 1. Get the full details using the mapbox_id
							const response = await fetch(
							`https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&session_token=${sessionToken}`
							);
							const data = await response.json();
							const feature = data.features[0];

							// 2. Format the object to match your new schema
							const selection = {
							name: suggestion.name, // The POI name (e.g., "Whole Foods") or Street Name
							address: suggestion.full_address,
							mapbox_id: suggestion.mapbox_id,
                            session_token: sessionToken,
							coordinates: feature.geometry.coordinates, // [lng, lat]
							metadata: {
								category: suggestion.poi_category || "address",
								is_poi: !!suggestion.poi_category
							}
							};

							setSearch(suggestion.name);
							setResults([]);
							onSelect(selection); // Send this rich object to your DB save function
						}}
						>
                        <div className="font-bold">{suggestion.name}</div>
                        <div className="text-xs text-gray-500">{suggestion.full_address}</div>
                    </li>
                ))}
                </ul>
            )}
            </div>
        </div>
      );
}