'use client'

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react"
import { supabase } from '../clients/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from "react"
import Image from "next/image"
import '../styles/globals.css'

export default function Nav() {
	const router = useRouter()
	const pathname = usePathname()
	const allButtonClassses = "bg-red-400 hover:bg-red-500 disabled:bg-gray-500"

	const handleLogout = async () => {

		const { error } = await supabase.auth.signOut()
		if (error) {
			console.error('Error signing out:', error.message)
		} else {
			console.log('Successfully signed out')
			router.push('/')
		}
	}

	const handleBack = () => {
		if (pathname == "/map") {
			return
		}
		router.back()
	}

	if (pathname == "/") return null
	
	return (
		<div id="nav" className="grid grid-cols-3 justify-between items-center w-full py-4 border-b-8 border-red-400">

			<div className="col-start-1 justify-self-start flex items-center gap-2 mx-4">
				<Button color="primary" className={allButtonClassses} type="button" disabled={pathname == "/map"} onPress={handleBack}>go back</Button>
				<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/sandbox")}>sandbox</Button>
			</div>

			<Image className="col-start-2 justify-self-center cursor-pointer hover:brightness-75" src="/favicon.ico" width={100} height={100} alt="Logo" onClick={() => router.push("/map")}/>

			<div className="col-start-3 justify-self-end flex items-center gap-2 mx-4">
				<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/seeAllMeets")}>see meets</Button>
				<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/create")}>new meet</Button>
				<Dropdown className="blip-main">
					<DropdownTrigger>
						<Button isIconOnly color="primary" className={allButtonClassses} type="button" >
							<Image className="col-start-2 justify-self-center cursor-pointer hover:brightness-75" width={30} height={30} src="/favicon.ico" alt="logo" />
						</Button>
					</DropdownTrigger>
					<DropdownMenu aria-label="Profile Actions">
						<DropdownItem key="new" onPress={() => router.push("/profile")}>View Profile</DropdownItem>
						<DropdownItem key="logout" onPress={handleLogout}>Log Out</DropdownItem>
					</DropdownMenu>
				</Dropdown>
			</div>
		</div>
	)
}