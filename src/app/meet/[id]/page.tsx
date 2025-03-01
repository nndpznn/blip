'use client'

import Meet from "../../../models/meet"

import { Button } from "@heroui/button"
import { Input, Textarea} from "@heroui/input";
import { useRouter } from 'next/navigation'
import Image from "next/image";

export default function MeetDetail() {

	const exampleMeet = new Meet("O-Block Annual Meet", "pull up, no funny shit stg", [-87.616, 41.776])

	const router = useRouter()

	return (
		<div >
			<div id="nav" className="flex justify-center items-center gap-4 w-full py-4 border-b-8 border-red-400">
				<Button color="primary" className="absolute top-10 left-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/map")}>go back</Button>

				<Image className="cursor-pointer hover:brightness-75" src="/favicon.ico" width={120} height={120} alt="Logo" onClick={() => router.push("/")}/>

				{/* <Button color="primary" className="absolute top-10 right-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/create")}>new meet</Button> */}
			</div>
			
			<div className="flex">
				<div className="w-1/3 h-screen border-r-4 border-red-400">
					<p className="text-center font-bold text-4xl mx-6 mt-8">{exampleMeet.title}</p>

					<p className="text-center text-xl mx-6 mt-2">Organized by PLACEHOLDER</p>

					<p className="text-center break-words mx-12 mt-12">This is the description. Stuff for the description goes here! Description stuff. Lorem ipsum or somethin idk</p>
				</div>

				<div className="w-2/3 h-screen border-l-4 border-red-400">
					<p className="text-center">PLACEHOLDER</p>
				</div>
			</div>
			
		</div>
	);
}