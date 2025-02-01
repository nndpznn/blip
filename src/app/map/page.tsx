"use client"

// imports
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Map() {
	const router = useRouter()

	return (
		<div>
			<button className="m-4 bg-blue-500 text-white px-4 py-2 rounded" type="button" onClick={() => router.push("/")}>go back</button>
			{/* <Link href="/">go back</Link> */}

			<br></br>

			<h1 className="font-bold text-8xl text-center">CAC map YIPPIE</h1>

			<p className="italic text-4xl text-center">welcome to cac map - nolan and brenden</p>

			<a className="m-4 bg-blue-500 text-white px-4 py-2 rounded" href="https://github.com/nndpznn/carsNcoffeeFinder">link to documentation</a>


		</div>
	);
}