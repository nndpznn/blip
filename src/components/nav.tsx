'use client'

import { Button } from "@heroui/react"
import { supabase } from '../clients/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'
import LogoutButton from "./logoutButton"
import Image from "next/image"
import '../styles/globals.css'

export default function Nav() {
	const router = useRouter()
	const pathname = usePathname()
	const allButtonClassses = "mx-4 bg-red-400 hover:text-red-400"

	if (pathname == "/") return null
	
	return (
			<div id="nav" className="flex justify-between items-center w-full py-4 border-b-8 border-red-400">
				<div className="flex gap-2">
					<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.back()}>go back</Button>
					<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/profile")}>map</Button>
				</div>


				<Image className="cursor-pointer hover:brightness-75" src="/favicon.ico" width={120} height={120} alt="Logo" onClick={() => router.push("/map")}/>

				<div className="flex gap-2">
					<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/create")}>new meet</Button>
					<LogoutButton color="primary" className={allButtonClassses} type="button" />
				</div>

			</div>
		
	)
}