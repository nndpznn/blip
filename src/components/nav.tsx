'use client'

import { useState, useEffect } from "react"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react"
import { supabase } from '../clients/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'
import Image from "next/image"
import '../styles/globals.css'

export default function Nav() {
	const router = useRouter()
	const pathname = usePathname()
	const [path, setPath] = useState<string | null>(null)
	const allButtonClassses = "bg-[var(--page-accent)] hover:bg-[var(--page-accent-hover)] disabled:bg-gray-500"

	// Only use pathname for visibility after mount so server and client first paint match (avoids hydration error)
	useEffect(() => {
		setPath(pathname)
	}, [pathname])

	const handleLogout = async () => {

		const { error } = await supabase.auth.signOut()
		if (error) {
			console.error('Error signing out:', error.message)
		} else {
			console.log('Successfully signed out')
			router.push('/')
		}
	}

	const hideNav = path !== null && (path === "/" || path === "/loginrequired")

	return (
		<div
			id="nav"
			className={`grid grid-cols-3 justify-between items-center w-full py-4 border-b-8 border-b-[var(--page-accent)] ${hideNav ? "hidden" : ""}`}
			aria-hidden={hideNav ? true : undefined}
		>

			<div className="col-start-1 justify-self-start flex items-center gap-2 mx-4">
				{/* <Button color="primary" className={`${allButtonClassses} items-center justify-center gap-1.5`} type="button" disabled={pathname == "/map"} onPress={handleBack} startContent={<span className="inline-flex items-center justify-center shrink-0"><ChevronLeftIcon className="size-5 block" /></span>}></Button> */}
				<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/sandbox")}>Sandbox</Button>
			</div>

			<Image className="col-start-2 justify-self-center cursor-pointer opacity-100 transition-opacity duration-200 ease-out hover:opacity-70" src="/favicon.ico" width={100} height={100} alt="Logo" onClick={() => router.push("/map")}/>

			<div className="col-start-3 justify-self-end flex items-center gap-2 mx-4">
				<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/seeAllMeets")}>All Meets</Button>
				<Button color="primary" className={allButtonClassses} type="button" onPress={() => router.push("/create")}>New</Button>
				<Dropdown className="blip-main">
					<DropdownTrigger>
						<Button isIconOnly color="primary" className={allButtonClassses} type="button" >
							<Image className="col-start-2 justify-self-center cursor-pointer hover:brightness-75" width={30} height={30} src="/favicon.ico" alt="logo" />
						</Button>
					</DropdownTrigger>
					<DropdownMenu aria-label="Profile Actions">
						<DropdownItem key="new" onPress={() => router.push("/profile")}>View profile</DropdownItem>
						<DropdownItem key="report" onPress={() => router.push("/issue")}>Report an issue</DropdownItem>
						<DropdownItem key="logout" onPress={handleLogout}>Log out</DropdownItem>
					</DropdownMenu>
				</Dropdown>
			</div>
		</div>
	)
}