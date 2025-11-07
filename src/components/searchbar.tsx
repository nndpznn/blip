import { Button } from "@heroui/react";
import { useState, useEffect } from "react";

export default function Searchbar({
	onSelect,
}: {
  onSelect: (result: any) => void;
}) {
	const [search, setSearch] = useState("")
	const [results, setResults] = useState<any[]>([]);

	useEffect(() => {
		const controller = new AbortController()
		const timeout = setTimeout(() => {
			if (search.length < 3) {
				setResults([])
				return;
			}
	  
			fetch(
			  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
				search
			  )}.json?autocomplete=true&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&limit=5&country=US&bbox=-124.4,32.5,-114.1,42.0`,
			  { signal: controller.signal }
			)
			  .then((res) => res.json())
			  .then((data) => {
				setResults(data.features);
			  })
			  .catch((err) => {
				if (err.name !== "AbortError") console.error(err);
			  });
		}, 300); // debounce

		return () => {
			clearTimeout(timeout);
			controller.abort();
		};
	}, [search]);

	return (
		<div className="relative w-screen max-w-md">
			<div className="relative w-full">
				<div className="flex items-center">
					<input
						type="text"
						value={search}
						placeholder="search an area"
						className="w-full p-2 bg-black text-gray-200 placeholder-gray-400 border border-gray-700 rounded"
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Button onPress={() => setSearch("")}>clear</Button>
				</div>
	
				{results.length > 0 && (
				<ul className="absolute z-50 bg-black rounded shadow w-full max-h-60 overflow-y-auto">
				{results.map((place) => (
					<li
					key={place.id}
					onClick={() => {
						setSearch(place.place_name);
						setResults([]);
						onSelect(place);
					}}
					className="p-2 text-gray-300 hover:bg-gray-8800 cursor-pointer"
					>
					{place.place_name}
					</li>
				))}
				</ul>
			)}
			</div>
		</div>
	  );

}