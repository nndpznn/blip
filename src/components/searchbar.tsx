import { Button } from "@heroui/react";
import { useState, useEffect, useRef } from "react";
import { searchPlaces, type PlaceSuggestion, type SearchBias } from "@/util/photon";

export interface SearchResult {
  name: string;
  address: string;
  coordinates: [number, number];
  metadata: {
    category: string;
    is_poi: boolean;
  };
}

export default function Searchbar({
    onSelect,
    initialValue = "",
    getBias,
}: {
  onSelect: (result: SearchResult) => void;
  initialValue?: string;
  /** Called at search time; return a point (e.g. the map center) to rank nearby places first. */
  getBias?: () => SearchBias | null;
}) {
    const [search, setSearch] = useState(initialValue);
    const [results, setResults] = useState<PlaceSuggestion[]>([]);
    const [searched, setSearched] = useState(false);
    const [failed, setFailed] = useState(false);
    const isSelecting = useRef(false);
    const getBiasRef = useRef(getBias);
    useEffect(() => {
        getBiasRef.current = getBias;
    }, [getBias]);

    useEffect(() => {
        const controller = new AbortController();

        if (isSelecting.current) {
            isSelecting.current = false; 
            return;
        }

        const timeout = setTimeout(() => {
            if (search.length < 3) {
                setResults([]);
                setSearched(false);
                setFailed(false);
                return;
            }

            // Photon returns coordinates with each suggestion, so there is no separate retrieve call.
            searchPlaces(search, { signal: controller.signal, limit: 5, bias: getBiasRef.current?.() })
              .then((found) => {
                setResults(found);
                setFailed(false);
                setSearched(true);
              })
              .catch((err) => {
                if (err.name === "AbortError") return;
                console.error(err);
                setResults([]);
                setFailed(true);
                setSearched(true);
              });
        }, 300);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [search]);

    const handleSelect = (suggestion: PlaceSuggestion) => {
        // Clear results and update text immediately to avoid flicker/double-click issues
        isSelecting.current = true;
        setResults([]);
        setSearched(false);
        setFailed(false);
        setSearch(suggestion.name);

        onSelect({
            name: suggestion.name,
            address: suggestion.address,
            coordinates: suggestion.coordinates,
            metadata: {
                category: suggestion.category || "address",
                is_poi: !!suggestion.category,
            },
        });
    };

    return (
        <div className="relative w-screen max-w-md">
            <div className="relative w-full">
                <div className="flex items-center">
                    <input
                        type="text"
                        value={search}
                        placeholder="Search addresses or businesses..."
                        className="w-full p-2 bg-black rounded-l-lg"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button radius="none" className="rounded-r-lg bg-black" onPress={() => {setSearch(""); setResults([]); setSearched(false); setFailed(false);}}>clear</Button>
                </div>

                {searched && results.length === 0 && search.length >= 3 && (
                    <div className="absolute z-50 bg-black rounded mt-2 p-3 w-full text-sm text-gray-400 shadow-xl">
                        {failed
                            ? "Search is unavailable right now. Please try again in a moment."
                            : "No matches in California. Try a street address or the business's exact name."}
                    </div>
                )}
    
                {results.length > 0 && (
                <ul className="absolute z-50 bg-black rounded mt-2 p-3 w-full max-h-60 overflow-y-auto shadow-xl transition-colors-opacity duration-200 ease-out">
                {results.map((suggestion) => (
                    <li
						key={suggestion.id}
                        onClick={() => handleSelect(suggestion)}
						>
                        <div className="font-bold">{suggestion.name}</div>
                        <div className="text-xs text-gray-500">{suggestion.address}</div>
                    </li>
                ))}
                </ul>
            )}
            </div>
        </div>
      );
}
