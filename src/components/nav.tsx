'use client'

import { useState, useEffect } from "react"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react"
import { supabase } from '../clients/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'
import Image from "next/image"
import { MapViewIcon } from "@/assets/MapViewIcon"
import { ListViewIcon } from "@/assets/ListViewIcon"
import { PlusIcon } from "@/assets/PlusIcon"
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
	const isMapView = path === "/map"
	const isListView = path === "/seeAllMeets"

	return (
		<div
			id="nav"
			className={`grid grid-cols-3 justify-between items-center w-full py-4 border-b-8 border-b-(--page-accent) ${hideNav ? "hidden" : ""}`}
			aria-hidden={hideNav ? true : undefined}
		>

			<div className="col-start-1 justify-self-start flex items-center gap-3 mx-4">
				<Dropdown className="blip-main">
					<DropdownTrigger>
						<Button isIconOnly color="primary" className={`${allButtonClassses} min-w-11 min-h-11 w-11 h-11`} type="button" aria-label="Menu">
							<Image className="cursor-pointer hover:brightness-75" width={36} height={36} src="/favicon.ico" alt="Menu" />
						</Button>
					</DropdownTrigger>
					<DropdownMenu aria-label="Profile Actions">
						<DropdownItem key="new" onPress={() => router.push("/profile")}>View profile</DropdownItem>
						<DropdownItem key="report" onPress={() => router.push("/issue")}>Report an issue</DropdownItem>
						<DropdownItem key="logout" onPress={handleLogout}>Log out</DropdownItem>
					</DropdownMenu>
				</Dropdown>
				<div
					role="tablist"
					aria-label="View mode"
					className="relative grid grid-cols-2 rounded-lg bg-white/10 p-1.5"
				>
					<span
						className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-md bg-(--page-accent) transition-transform duration-200 ease-out"
						style={{ transform: isListView ? "translateX(100%)" : "translateX(0)" }}
					/>
					<button
						type="button"
						role="tab"
						aria-selected={isMapView}
						aria-label="Map view"
						className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-200 ${isMapView ? "text-white" : "text-white/60 hover:text-white/80"}`}
						onClick={() => router.push("/map")}
					>
						<MapViewIcon className="size-6" />
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={isListView}
						aria-label="List view"
						className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-200 ${isListView ? "text-white" : "text-white/60 hover:text-white/80"}`}
						onClick={() => router.push("/seeAllMeets")}
					>
						<ListViewIcon className="size-6" />
					</button>
				</div>
			</div>

			<Image className="col-start-2 justify-self-center cursor-pointer opacity-100 transition-opacity duration-200 ease-out hover:opacity-70" src="/favicon.ico" width={70} height={70} alt="Logo" onClick={() => router.push("/map")}/>

			<div className="col-start-3 justify-self-end flex items-center gap-2 mx-4">
				<Button isIconOnly color="primary" className={`${allButtonClassses} min-w-11 min-h-11 w-11 h-11`} type="button" aria-label="Create meet" onPress={() => router.push("/create")}>
					<PlusIcon className="size-6" />
				</Button>
			</div>
		</div>
	)
}