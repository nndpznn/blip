'use client'

import { Button } from "@heroui/react"
import { useRouter } from 'next/navigation'

export default function Nav() {
	const router = useRouter()
	
	return (
		<div id="nav" className="flex justify-center items-center gap-4 w-full py-4 border-b-8 border-red-400">
				<Button color="primary" className="absolute top-10 left-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/map")}>go back</Button>

				<img src="../favicon.ico" className="flex w-[120px] h-[120px] cursor-pointer hover:opacity-75" onClick={() => router.push("/")}></img>

				{/* <Button color="primary" className="absolute top-10 right-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/create")}>new meet</Button> */}
		</div>
		
	)
}