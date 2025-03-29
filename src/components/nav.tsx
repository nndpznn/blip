'use client'

import { Button } from "@heroui/react"
import { useRouter, usePathname } from 'next/navigation'
import Image from "next/image"
import '../styles/globals.css'

export default function Nav() {
	const router = useRouter()
	const pathname = usePathname()

	if (pathname == "/") return null
	
	return (
			<div id="nav" className="flex justify-center items-center gap-4 w-full py-4 border-b-8 border-red-400">
				<Button color="primary" className="bg-red-400 absolute top-10 left-4 m-4 hover:text-red-400" type="button" onPress={() => router.back()}>go back</Button>

				<Image className="cursor-pointer hover:brightness-75" src="/favicon.ico" width={120} height={120} alt="Logo" onClick={() => router.push("/")}/>

				<Button color="primary" className="bg-red-400 absolute top-10 right-4 m-4 hover:text-red-400" type="button" onPress={() => router.push("/create")}>new meet</Button>
			</div>
		
	)
}